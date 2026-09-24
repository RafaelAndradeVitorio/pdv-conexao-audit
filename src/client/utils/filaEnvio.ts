import { gravar, listar, remover } from './armazenamentoLocal';

/**
 * Fila de envio das auditorias.
 * A auditoria finalizada vai primeiro para o aparelho (IndexedDB) e é enviada quando há conexão:
 * sobe as fotos que ainda não subiram e depois envia o formulário. Sem sinal no metrô,
 * fica guardada e é reenviada automaticamente.
 */

export interface FotoPendente {
  tipo: string;
  base64: string;
  tamanhoBytes: number;
  /** Preenchida quando a foto já subiu para o servidor */
  url?: string;
}

export interface EnvioPendente {
  lojaId: string;
  lojaNome: string;
  cnpj: string;
  pesquisadorId: string;
  /** Formulário validado, sem as fotos */
  payload: Record<string, unknown>;
  fotos: FotoPendente[];
  criadoEm: string;
  tentativas: number;
  /** aguardando = será reenviada; erro = precisa de ação do pesquisador */
  situacao: 'aguardando' | 'erro';
  mensagem?: string;
}

export type ResultadoEnvio =
  | { resultado: 'enviado' }
  | { resultado: 'tentar-depois'; mensagem: string }
  | { resultado: 'erro'; mensagem: string };

export class ErroEnvio extends Error {
  constructor(public status: number, message: string, public corpo: Record<string, any> = {}) {
    super(message);
  }
}

export interface ApiEnvio {
  uploadFoto(dados: { cnpj: string; tipo: string; base64: string }): Promise<{ url: string; tamanhoBytes: number }>;
  submeter(corpo: Record<string, unknown>): Promise<void>;
}

const SEM_CONEXAO = 'Sem conexão com o servidor';

/** Sem resposta (status 0), servidor fora do ar ou sobrecarregado: vale tentar de novo */
const temporario = (status: number) => status === 0 || status === 408 || status === 429 || status >= 500;

/**
 * Tenta enviar uma auditoria. `salvarProgresso` guarda as URLs das fotos já enviadas,
 * para que uma nova tentativa não suba as mesmas fotos outra vez.
 */
export async function enviarUm(
  envio: EnvioPendente,
  api: ApiEnvio,
  salvarProgresso: (e: EnvioPendente) => Promise<void> = async () => undefined
): Promise<ResultadoEnvio> {
  try {
    for (const foto of envio.fotos) {
      if (foto.url) continue;
      const enviada = await api.uploadFoto({ cnpj: envio.cnpj, tipo: foto.tipo, base64: foto.base64 });
      foto.url = enviada.url;
      foto.tamanhoBytes = enviada.tamanhoBytes || foto.tamanhoBytes;
      await salvarProgresso(envio);
    }

    await api.submeter({
      ...envio.payload,
      fotos: envio.fotos.map((f) => ({ tipo: f.tipo, url: f.url!, tamanhoBytes: f.tamanhoBytes, base64: f.base64 }))
    });
    return { resultado: 'enviado' };
  } catch (err) {
    const status = err instanceof ErroEnvio ? err.status : 0;
    const mensagem = err instanceof Error ? err.message : 'Falha no envio';

    if (temporario(status)) {
      return { resultado: 'tentar-depois', mensagem: status === 0 ? SEM_CONEXAO : mensagem };
    }
    // Um envio anterior chegou ao servidor mas a resposta se perdeu: a auditoria já é deste pesquisador
    if (status === 409 && err instanceof ErroEnvio && err.corpo.pesquisadorId === envio.pesquisadorId) {
      return { resultado: 'enviado' };
    }
    return { resultado: 'erro', mensagem };
  }
}

// ---------------------------------------------------------------------------
// API real e fila persistida no aparelho

async function lerErro(res: Response): Promise<ErroEnvio> {
  const corpo = await res.json().catch(() => ({}));
  let mensagem = corpo.error || `Erro ${res.status}`;
  if (Array.isArray(corpo.issues)) mensagem = corpo.issues.map((i: any) => i.mensagem).join('; ');
  if (res.status === 413) mensagem = 'Fotos grandes demais para enviar. Refaça as fotos e tente de novo';
  return new ErroEnvio(res.status, mensagem, corpo);
}

/**
 * Sinal fraco no metrô pode deixar a requisição pendurada por minutos e travar a fila.
 * O limite cresce com o tamanho (fotos): 30s + 1s a cada 20 KB.
 */
const limiteMs = (tamanho: number) => 30_000 + Math.ceil(tamanho / 20_000) * 1000;

async function postJson(url: string, corpo: unknown): Promise<Response> {
  const body = JSON.stringify(corpo);
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limiteMs(body.length));
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controle.signal
    });
  } catch {
    // Se o servidor chegou a gravar, o reenvio recebe 409 do próprio pesquisador e conta como enviado
    throw new ErroEnvio(0, SEM_CONEXAO);
  } finally {
    clearTimeout(timer);
  }
}

export const apiEnvio: ApiEnvio = {
  async uploadFoto(dados) {
    const res = await postJson('/api/auditorias/upload-foto', dados);
    if (!res.ok) throw await lerErro(res);
    return res.json();
  },
  async submeter(corpo) {
    const res = await postJson('/api/auditorias', corpo);
    if (!res.ok) throw await lerErro(res);
  }
};

export const EVENTO_FILA = 'pdv:fila-atualizada';
const avisar = () => window.dispatchEvent(new Event(EVENTO_FILA));

const emEnvio = new Set<string>();
let processando: Promise<void> | null = null;

export const listarFila = () => listar<EnvioPendente>('fila');

export async function descartarDaFila(lojaId: string) {
  await remover('fila', lojaId);
  avisar();
}

async function tentar(envio: EnvioPendente): Promise<ResultadoEnvio> {
  emEnvio.add(envio.lojaId);
  try {
    const r = await enviarUm(envio, apiEnvio, (e) => gravar('fila', e.lojaId, e));
    if (r.resultado === 'enviado') {
      await remover('fila', envio.lojaId);
    } else {
      await gravar('fila', envio.lojaId, {
        ...envio,
        tentativas: envio.tentativas + 1,
        situacao: r.resultado === 'erro' ? 'erro' : 'aguardando',
        mensagem: r.mensagem
      });
    }
    return r;
  } finally {
    emEnvio.delete(envio.lojaId);
    avisar();
  }
}

/** Guarda a auditoria no aparelho e tenta enviar na hora */
export async function enfileirarEEnviar(envio: EnvioPendente): Promise<ResultadoEnvio> {
  await gravar('fila', envio.lojaId, envio);
  avisar();
  return tentar(envio);
}

/** Reenvia tudo o que está aguardando (chamado ao abrir o app, ao voltar a conexão e periodicamente) */
export function processarFila(incluirErros = false): Promise<void> {
  if (!processando) {
    processando = (async () => {
      const itens = await listarFila();
      for (const envio of itens) {
        if (emEnvio.has(envio.lojaId)) continue;
        if (envio.situacao === 'erro' && !incluirErros) continue;
        const r = await tentar(envio);
        // Sem conexão: não adianta tentar os próximos agora.
        // Erro do servidor em um envio não pode segurar os outros na fila.
        if (r.resultado === 'tentar-depois' && r.mensagem === SEM_CONEXAO) break;
      }
    })().finally(() => {
      processando = null;
    });
  }
  return processando;
}
