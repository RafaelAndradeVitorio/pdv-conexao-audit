import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/researcherStore';
import { useFilaEnvio } from '../hooks/useFilaEnvio';
import { enfileirarEEnviar, descartarDaFila, EnvioPendente, FotoPendente } from '../utils/filaEnvio';
import { gravar, ler, remover } from '../utils/armazenamentoLocal';
import { Loja } from '../../shared/types';
import {
  STATUS_ENTRADA,
  ESPACO_DISPONIVEL,
  POTENCIAL_DISPLAY,
  MARCAS_COCA_COLA,
  MAX_GELADEIRAS,
  fotosObrigatorias,
  fotosDaLoja,
  lerTipoFoto,
  tipoFotoGeladeira
} from '../../shared/constants';
import { AuditoriaSubmissionSchema } from '../../shared/schemas';
import { ResearcherSelector } from '../components/ResearcherSelector';
import { StoreSelector } from '../components/StoreSelector';
import { PhotoCaptureGrid, PhotoState } from '../components/PhotoCaptureGrid';
import { GeladeiraCard, GeladeiraForm, geladeiraInicial, geladeiraParaPayload } from '../components/GeladeiraCard';
import {
  ChecklistSection,
  SimNaoToggle,
  OpcoesChips,
  inputClass,
  textareaClass
} from '../components/ChecklistControls';
import {
  AlertCircle,
  Send,
  Loader2,
  CheckCircle2,
  Refrigerator,
  Zap,
  DollarSign,
  DoorOpen,
  Check,
  GlassWater,
  EyeOff,
  CloudUpload,
  History,
  Plus
} from 'lucide-react';

type Opcao<T extends readonly string[]> = T[number] | null;

interface ChecklistState {
  existeGeladeira: boolean | null;
  /** Uma entrada por geladeira da loja; cada uma com suas respostas e fotos */
  geladeiras: GeladeiraForm[];

  monsterPresente: boolean | null;
  marcasCocaPresentes: string[];

  espacoLivreCaixa: boolean | null;
  espacoLadoTamanho: string;
  boaVisibilidadeCaixa: boolean | null;
  produtosExpostosCaixa: string;
  espacoDisponivel: Opcao<typeof ESPACO_DISPONIVEL>;
  outrosDisplaysImpulso: boolean | null;
  displaysImpulsoMarcas: string;
  displaysImpulsoProximo: boolean | null;
  potencialDisplay: Opcao<typeof POTENCIAL_DISPLAY>;
  descricaoOportunidade: string;
}

// Nada vem pré-preenchido: o guia pede para não inventar informação (§12)
const checklistInicial = (): ChecklistState => ({
  existeGeladeira: null,
  geladeiras: [],
  monsterPresente: null,
  marcasCocaPresentes: [],
  espacoLivreCaixa: null,
  espacoLadoTamanho: '',
  boaVisibilidadeCaixa: null,
  produtosExpostosCaixa: '',
  espacoDisponivel: null,
  outrosDisplaysImpulso: null,
  displaysImpulsoMarcas: '',
  displaysImpulsoProximo: null,
  potencialDisplay: null,
  descricaoOportunidade: ''
});

interface Rascunho {
  statusEntrada: string | null;
  justificativaInoperante: string;
  form: ChecklistState;
  photos: Record<string, PhotoState>;
  salvoEm: string;
}

/**
 * Rascunho salvo antes de existirem várias geladeiras: as respostas soltas viram a Geladeira 1
 * e as fotos de geladeira ganham o número 1.
 */
function migrarRascunho(r: Rascunho): Rascunho {
  const antigo = r.form as ChecklistState & Record<string, any>;
  if (Array.isArray(antigo.geladeiras)) return r;
  const g1: GeladeiraForm = {
    ...geladeiraInicial(),
    marcaVisual: antigo.marcaVisualGeladeira ?? null,
    posse: antigo.posseGeladeira ?? null,
    monsterPresente: antigo.monsterPresente === false ? false : antigo.monsterNaGeladeira ?? null,
    mapaBebidas: antigo.mapaBebidas ?? geladeiraInicial().mapaBebidas,
    organizacao: antigo.organizacaoGeladeira ?? null,
    abastecimento: antigo.abastecimentoGeladeira ?? null,
    visibilidade: antigo.visibilidadeMarcas ?? null,
    concorrentesMisturados: antigo.concorrentesMisturados ?? null,
    concorrentesDetalhes: antigo.concorrentesDetalhes ?? ''
  };
  const photos: Record<string, PhotoState> = {};
  for (const [tipo, foto] of Object.entries(r.photos || {})) {
    const { base, geladeira } = lerTipoFoto(tipo);
    const chave = geladeira ? tipoFotoGeladeira(base, geladeira) : tipo;
    photos[chave] = { ...foto, tipo: chave };
  }
  return {
    ...r,
    form: { ...checklistInicial(), ...antigo, geladeiras: antigo.existeGeladeira ? [g1] : [] },
    photos
  };
}

// Loja em andamento: sobrevive a recarregar a página ou fechar o app no meio da visita
const CHAVE_LOJA_EM_ANDAMENTO = 'pdv_loja_em_andamento';

const lerLojaEmAndamento = (): Loja | null => {
  try {
    const raw = localStorage.getItem(CHAVE_LOJA_EM_ANDAMENTO);
    return raw ? (JSON.parse(raw) as Loja) : null;
  } catch {
    return null;
  }
};

const salvarLojaEmAndamento = (loja: Loja | null) => {
  try {
    if (loja) localStorage.setItem(CHAVE_LOJA_EM_ANDAMENTO, JSON.stringify(loja));
    else localStorage.removeItem(CHAVE_LOJA_EM_ANDAMENTO);
  } catch {
    // Sem localStorage: só não lembra a loja ao recarregar
  }
};

const horaCurta = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const ResearcherFlow: React.FC = () => {
  const { pesquisadorId } = useAppStore();
  const [selectedLoja, setSelectedLojaState] = useState<Loja | null>(lerLojaEmAndamento);
  const { itens: fila, reenviar } = useFilaEnvio();

  const [statusEntrada, setStatusEntrada] = useState<string | null>(null);
  const [justificativaInoperante, setJustificativaInoperante] = useState('');
  const [form, setForm] = useState<ChecklistState>(checklistInicial);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  /** Índice da geladeira com o card aberto (só uma por vez, para a tela não virar uma rolagem sem fim) */
  const [geladeiraAberta, setGeladeiraAberta] = useState<number | null>(0);

  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [enviadaOffline, setEnviadaOffline] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Rascunho: id da loja cujo rascunho já foi lido (antes disso não grava, para não apagar o salvo)
  const [rascunhoPronto, setRascunhoPronto] = useState<string | null>(null);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState<string | null>(null);

  const envioNaFila = selectedLoja ? fila.find((i) => i.lojaId === selectedLoja.id) : undefined;

  const setSelectedLoja = (loja: Loja | null) => {
    salvarLojaEmAndamento(loja);
    setSelectedLojaState(loja);
  };

  const limparFormulario = () => {
    setStatusEntrada(null);
    setJustificativaInoperante('');
    setForm(checklistInicial());
    setPhotos({});
    setGeladeiraAberta(0);
  };

  // Ao escolher uma loja, restaura o rascunho dela (se houver)
  useEffect(() => {
    let ativo = true;
    setRascunhoPronto(null);
    setRascunhoRestaurado(null);
    limparFormulario();
    if (!selectedLoja) return;

    ler<Rascunho>('rascunhos', selectedLoja.id).then((r) => {
      if (!ativo) return;
      if (r) {
        const rascunho = migrarRascunho(r);
        setStatusEntrada(rascunho.statusEntrada);
        setJustificativaInoperante(rascunho.justificativaInoperante);
        setForm({ ...checklistInicial(), ...rascunho.form });
        setPhotos(rascunho.photos);
        setRascunhoRestaurado(rascunho.salvoEm);
        // Reabre a primeira geladeira que ainda tem algo a responder
        setGeladeiraAberta(rascunho.form.geladeiras.length ? 0 : null);
      }
      setRascunhoPronto(selectedLoja.id);
    });
    return () => {
      ativo = false;
    };
  }, [selectedLoja?.id]);

  // Salva o rascunho a cada alteração
  useEffect(() => {
    if (!selectedLoja || rascunhoPronto !== selectedLoja.id) return;
    if (statusEntrada === null && Object.keys(photos).length === 0) return;
    const timer = window.setTimeout(() => {
      gravar<Rascunho>('rascunhos', selectedLoja.id, {
        statusEntrada,
        justificativaInoperante,
        form,
        photos,
        salvoEm: new Date().toISOString()
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [selectedLoja, rascunhoPronto, statusEntrada, justificativaInoperante, form, photos]);

  const descartarRascunho = async () => {
    if (!selectedLoja || !window.confirm('Apagar as respostas e fotos salvas desta loja?')) return;
    await remover('rascunhos', selectedLoja.id);
    setRascunhoRestaurado(null);
    limparFormulario();
  };

  const descartarEnvio = async () => {
    if (
      !envioNaFila ||
      !window.confirm(
        `Descartar a auditoria de ${envioNaFila.lojaNome} guardada neste aparelho? As respostas e fotos serão perdidas.`
      )
    )
      return;
    await descartarDaFila(envioNaFila.lojaId);
  };

  const isLojaBloqueada = selectedLoja?.status === 'CONCLUIDA' || selectedLoja?.status === 'FINALIZADA_INOPERANTE';
  const isInoperante = statusEntrada !== null && statusEntrada !== STATUS_ENTRADA.ABERTA;
  const temGeladeira = form.existeGeladeira === true;

  const contextoFotos = {
    inoperante: isInoperante,
    existeGeladeira: form.existeGeladeira,
    geladeiras: form.geladeiras,
    espacoLivreCaixa: form.espacoLivreCaixa
  };
  const tiposFoto = statusEntrada ? fotosObrigatorias(contextoFotos) : [];
  // As fotos de cada geladeira ficam no card dela; aqui só as da loja
  const tiposFotoLoja = statusEntrada ? fotosDaLoja(contextoFotos) : [];
  const geladeirasComMonster = temGeladeira ? form.geladeiras.filter((g) => g.monsterPresente === true).length : 0;

  const set = <K extends keyof ChecklistState>(campo: K, valor: ChecklistState[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const setExisteGeladeira = (v: boolean) => {
    setForm((prev) => ({
      ...prev,
      existeGeladeira: v,
      // Ao dizer que tem geladeira, a Geladeira 1 já aparece aberta
      geladeiras: v && prev.geladeiras.length === 0 ? [geladeiraInicial()] : prev.geladeiras
    }));
    if (v) setGeladeiraAberta((atual) => atual ?? 0);
  };

  const setGeladeira = (indice: number, patch: Partial<GeladeiraForm>) =>
    setForm((prev) => ({
      ...prev,
      geladeiras: prev.geladeiras.map((g, i) => (i === indice ? { ...g, ...patch } : g)),
      // Monster em uma geladeira = Monster na loja
      monsterPresente: patch.monsterPresente === true ? true : prev.monsterPresente
    }));

  const adicionarGeladeira = () => {
    if (form.geladeiras.length >= MAX_GELADEIRAS) return;
    setGeladeiraAberta(form.geladeiras.length);
    setForm((prev) => ({ ...prev, geladeiras: [...prev.geladeiras, geladeiraInicial()] }));
  };

  const removerGeladeira = (indice: number) => {
    const numero = indice + 1;
    if (!window.confirm(`Remover a Geladeira ${numero} com as respostas e fotos dela?`)) return;
    setForm((prev) => ({ ...prev, geladeiras: prev.geladeiras.filter((_, i) => i !== indice) }));
    // As geladeiras seguintes sobem um número, junto com as fotos
    setPhotos((prev) => {
      const novas: Record<string, PhotoState> = {};
      for (const [tipo, foto] of Object.entries(prev)) {
        const { base, geladeira } = lerTipoFoto(tipo);
        if (geladeira === null) novas[tipo] = foto;
        else if (geladeira < numero) novas[tipo] = foto;
        else if (geladeira > numero) {
          const chave = tipoFotoGeladeira(base, geladeira - 1);
          novas[chave] = { ...foto, tipo: chave };
        }
      }
      return novas;
    });
    setGeladeiraAberta(null);
  };

  const toggleMarcaCoca = (marca: string) =>
    setForm((prev) => ({
      ...prev,
      marcasCocaPresentes: prev.marcasCocaPresentes.includes(marca)
        ? prev.marcasCocaPresentes.filter((m) => m !== marca)
        : [...prev.marcasCocaPresentes, marca]
    }));

  const handlePhotoCaptured = (tipo: string, data: { size: number; previewUrl: string }) => {
    setPhotos((prev) => ({
      ...prev,
      [tipo]: {
        tipo,
        previewUrl: data.previewUrl,
        status: 'success',
        compressedKb: Math.round(data.size / 1024)
      }
    }));
  };

  const handlePhotoReset = (tipo: string) => {
    setPhotos((prev) => {
      const copy = { ...prev };
      delete copy[tipo];
      return copy;
    });
  };

  // Só envia fotos ainda exigidas pelas respostas atuais
  const fotosParaEnvio = (): FotoPendente[] =>
    Object.values(photos)
      .filter((p) => !!p.previewUrl && tiposFoto.includes(p.tipo as (typeof tiposFoto)[number]))
      .map((p) => ({
        tipo: p.tipo,
        base64: p.previewUrl!,
        tamanhoBytes: (p.compressedKb || 300) * 1024
      }));

  const montarPayload = (loja: Loja, pesquisador: string, status: string) => {
    const base = {
      lojaId: loja.id,
      pesquisadorId: pesquisador,
      statusEntrada: status
    };

    if (isInoperante) {
      return { ...base, justificativaInoperante };
    }

    const f = form;
    const texto = (v: string) => v.trim() || null;
    return {
      ...base,
      justificativaInoperante: null,
      existeGeladeira: f.existeGeladeira,
      geladeiras: temGeladeira ? f.geladeiras.map(geladeiraParaPayload) : [],
      monsterPresente: f.monsterPresente,
      marcasCocaPresentes: f.marcasCocaPresentes,
      espacoLivreCaixa: f.espacoLivreCaixa,
      espacoLadoTamanho: f.espacoLivreCaixa ? texto(f.espacoLadoTamanho) : null,
      boaVisibilidadeCaixa: f.espacoLivreCaixa ? f.boaVisibilidadeCaixa : null,
      produtosExpostosCaixa: texto(f.produtosExpostosCaixa),
      espacoDisponivel: f.espacoDisponivel,
      outrosDisplaysImpulso: f.outrosDisplaysImpulso,
      displaysImpulsoMarcas: f.outrosDisplaysImpulso ? texto(f.displaysImpulsoMarcas) : null,
      displaysImpulsoProximo: f.outrosDisplaysImpulso ? f.displaysImpulsoProximo : null,
      potencialDisplay: f.potencialDisplay,
      descricaoOportunidade: texto(f.descricaoOportunidade)
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMessage(null);
    setSubmitErrors([]);

    if (!pesquisadorId) {
      setSubmitErrors(['Selecione quem é o pesquisador responsável no topo da página.']);
      return;
    }
    if (!selectedLoja) {
      setSubmitErrors(['Selecione a loja a ser auditada.']);
      return;
    }
    if (isLojaBloqueada) {
      setSubmitErrors(['Esta loja já foi auditada anteriormente e está bloqueada para envio.']);
      return;
    }
    if (!statusEntrada) {
      setSubmitErrors(['Informe o registro inicial da loja (aberta, fechada, em reforma ou outro).']);
      return;
    }

    // Mesma validação do servidor, para apontar tudo o que falta antes de enviar.
    // As fotos ainda não têm URL (sobem pela fila), então valida com uma URL provisória.
    const fotos = fotosParaEnvio();
    const validacao = AuditoriaSubmissionSchema.safeParse({
      ...montarPayload(selectedLoja, pesquisadorId, statusEntrada),
      fotos: fotos.map((f) => ({ tipo: f.tipo, url: 'aguardando-envio' }))
    });
    if (!validacao.success) {
      const mensagens = validacao.error.issues.map((i) => i.message);
      // Abre o card da primeira geladeira com pendência
      const daGeladeira = mensagens.map((m) => /^Geladeira (\d+):/.exec(m)).find(Boolean);
      if (daGeladeira) setGeladeiraAberta(Number(daGeladeira[1]) - 1);
      setSubmitErrors([...new Set(mensagens)]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const { fotos: _provisorias, ...payload } = validacao.data;
    const envio: EnvioPendente = {
      lojaId: selectedLoja.id,
      lojaNome: selectedLoja.nome,
      cnpj: selectedLoja.cnpj,
      pesquisadorId,
      payload,
      fotos,
      criadoEm: new Date().toISOString(),
      tentativas: 0,
      situacao: 'aguardando'
    };

    setEnviando(true);
    try {
      const r = await enfileirarEEnviar(envio);
      if (r.resultado === 'erro') {
        // Recusada pelo servidor (ex.: loja já auditada por outra pessoa): mantém o formulário
        await descartarDaFila(envio.lojaId);
        setSubmitErrors([r.mensagem]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      await remover('rascunhos', envio.lojaId);
      setEnviadaOffline(r.resultado === 'tentar-depois');
      setSubmitSuccessMessage(
        r.resultado === 'enviado'
          ? `Auditoria da loja ${envio.lojaNome} finalizada com sucesso como ${
              isInoperante ? 'FINALIZADA_INOPERANTE' : 'CONCLUIDA'
            }!`
          : `Sem conexão agora. A auditoria da loja ${envio.lojaNome} ficou salva no aparelho e será enviada automaticamente quando o sinal voltar.`
      );
      setSelectedLoja(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 font-roboto">
      {submitSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl text-emerald-900 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
          {enviadaOffline ? (
            <CloudUpload className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
              {enviadaOffline ? 'Auditoria salva no aparelho' : 'Auditoria Enviada!'}
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-200/90 mt-0.5">{submitSuccessMessage}</p>
            <button
              onClick={() => setSubmitSuccessMessage(null)}
              className="mt-2 text-xs font-semibold underline text-emerald-700 dark:text-emerald-300"
            >
              Iniciar Próxima Loja
            </button>
          </div>
        </div>
      )}

      {submitErrors.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-3xl text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">
              {submitErrors.length > 1 ? `Faltam ${submitErrors.length} itens para enviar` : 'Não foi possível enviar'}
            </h4>
            <ul className="text-xs text-rose-800 dark:text-rose-200/90 mt-1 space-y-0.5 list-disc pl-4">
              {submitErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ResearcherSelector />

      <StoreSelector selectedLoja={selectedLoja} onSelectLoja={setSelectedLoja} />

      {selectedLoja && envioNaFila && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-3xl text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
          <CloudUpload className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">
              {envioNaFila.situacao === 'erro' ? 'Envio desta loja precisa de atenção' : 'Auditoria desta loja aguardando envio'}
            </p>
            <p>
              Finalizada às {horaCurta(envioNaFila.criadoEm)} e salva no aparelho.
              {envioNaFila.mensagem ? ` Última tentativa: ${envioNaFila.mensagem}.` : ''}
            </p>
            {envioNaFila.situacao === 'erro' && (
              <div className="flex flex-wrap gap-3 pt-1">
                <button type="button" onClick={() => reenviar()} className="font-semibold underline">
                  Tentar de novo
                </button>
                <button type="button" onClick={descartarEnvio} className="font-semibold underline text-rose-700 dark:text-rose-300">
                  Descartar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedLoja && !isLojaBloqueada && !envioNaFila && rascunhoRestaurado && (
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 shrink-0" />
            <span>Rascunho restaurado (salvo às {horaCurta(rascunhoRestaurado)}).</span>
          </span>
          <button type="button" onClick={descartarRascunho} className="font-semibold underline shrink-0">
            Descartar
          </button>
        </div>
      )}

      {selectedLoja && !isLojaBloqueada && !envioNaFila && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guia §2: visita discreta */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            <EyeOff className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
            <span>
              Entre como consumidor comum, sem informar que é pesquisa. Se precisar perguntar, use perguntas simples
              ("Essa geladeira é de vocês?"). Quando não der para confirmar algo, marque "Não foi possível identificar".
            </span>
          </div>

          {/* §3 Registro inicial */}
          <ChecklistSection icon={<DoorOpen className="w-4 h-4" />} titulo="Registro Inicial">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(STATUS_ENTRADA).map(([key, label]) => {
                const isSelected = statusEntrada === label;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setStatusEntrada(label)}
                    className={`p-3.5 text-xs font-semibold rounded-2xl border text-left transition-all touch-manipulation flex items-center justify-between min-w-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>

            {isInoperante && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  {statusEntrada === STATUS_ENTRADA.OUTRO ? 'Descreva a situação (obrigatório):' : 'Justificativa (obrigatória):'}
                </label>
                <textarea
                  value={justificativaInoperante}
                  onChange={(e) => setJustificativaInoperante(e.target.value)}
                  placeholder="Ex: Loja fechada com grades na estação, obras no mezanino, quiosque desativado..."
                  rows={3}
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded-2xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none shadow-sm transition"
                  required
                />
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Tire apenas a foto da <strong>Visão geral / fachada</strong> comprovando a situação e envie.
                </p>
              </div>
            )}
          </ChecklistSection>

          {statusEntrada === STATUS_ENTRADA.ABERTA && (
            <div className="space-y-4">
              {/* §4 a §7 Geladeiras: um bloco por geladeira, com respostas e fotos dela */}
              <ChecklistSection icon={<Refrigerator className="w-4 h-4" />} titulo="Geladeiras de Bebidas">
                <SimNaoToggle
                  pergunta="Existe geladeira de bebidas?"
                  value={form.existeGeladeira}
                  onChange={setExisteGeladeira}
                />
                {temGeladeira && (
                  <div className="space-y-2.5">
                    {form.geladeiras.length > 1 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {form.geladeiras.length} geladeiras nesta loja. Cada uma vira uma linha no relatório.
                      </p>
                    )}
                    {form.geladeiras.map((g, i) => (
                      <GeladeiraCard
                        key={i}
                        numero={i + 1}
                        geladeira={g}
                        aberta={geladeiraAberta === i}
                        onToggle={() => setGeladeiraAberta((atual) => (atual === i ? null : i))}
                        onChange={(patch) => setGeladeira(i, patch)}
                        onRemove={form.geladeiras.length > 1 ? () => removerGeladeira(i) : undefined}
                        photos={photos}
                        onPhotoCaptured={handlePhotoCaptured}
                        onPhotoReset={handlePhotoReset}
                      />
                    ))}
                    {form.geladeiras.length < MAX_GELADEIRAS && (
                      <button
                        type="button"
                        onClick={adicionarGeladeira}
                        className="w-full h-12 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 touch-manipulation transition"
                      >
                        <Plus className="w-4 h-4" /> Adicionar outra geladeira
                      </button>
                    )}
                  </div>
                )}
              </ChecklistSection>

              {/* §5 Monster na loja (dentro ou fora das geladeiras) */}
              <ChecklistSection icon={<Zap className="w-4 h-4" />} titulo="Presença de Monster">
                <SimNaoToggle
                  pergunta="Existe Monster na loja?"
                  value={form.monsterPresente}
                  onChange={(v) => set('monsterPresente', v)}
                />
                {geladeirasComMonster > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Monster em {geladeirasComMonster} {geladeirasComMonster === 1 ? 'geladeira' : 'geladeiras'}.
                  </p>
                )}
              </ChecklistSection>

              {/* §6 Marcas Coca-Cola vistas na loja */}
              <ChecklistSection icon={<GlassWater className="w-4 h-4" />} titulo="Marcas Coca-Cola na Loja">
                <div>
                  <label className="text-xs text-slate-800 dark:text-slate-200 font-semibold block mb-2.5">
                    Marcas Coca-Cola encontradas (toque nas que viu):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MARCAS_COCA_COLA.map((marca) => {
                      const checked = form.marcasCocaPresentes.includes(marca);
                      return (
                        <button
                          key={marca}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => toggleMarcaCoca(marca)}
                          className={`p-2.5 rounded-2xl text-xs font-medium border text-left flex items-center justify-between transition-all touch-manipulation min-w-0 ${
                            checked
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 font-bold shadow-sm'
                              : 'bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                          }`}
                        >
                          <span className="truncate">{marca}</span>
                          <span className={`text-xs font-bold ml-1 shrink-0 ${checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                            {checked ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ChecklistSection>

              {/* §9 Caixa e entorno – Display Coca-Cola Vai Até Você */}
              <ChecklistSection icon={<DollarSign className="w-4 h-4" />} titulo='Caixa e Entorno – Display "Coca-Cola Vai Até Você"'>
                <SimNaoToggle
                  pergunta="Existe espaço livre próximo ao caixa?"
                  value={form.espacoLivreCaixa}
                  onChange={(v) => set('espacoLivreCaixa', v)}
                />
                {form.espacoLivreCaixa && (
                  <>
                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                        Lado do caixa e espaço disponível:
                      </label>
                      <input
                        type="text"
                        value={form.espacoLadoTamanho}
                        onChange={(e) => set('espacoLadoTamanho', e.target.value)}
                        placeholder="Ex: Balcão à direita, ~50cm livres ao lado da máquina de cartão..."
                        className={inputClass}
                      />
                    </div>
                    <SimNaoToggle
                      pergunta="O local tem boa visibilidade para o consumidor?"
                      value={form.boaVisibilidadeCaixa}
                      onChange={(v) => set('boaVisibilidadeCaixa', v)}
                    />
                  </>
                )}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                    Produtos atualmente expostos no caixa:
                  </label>
                  <input
                    type="text"
                    value={form.produtosExpostosCaixa}
                    onChange={(e) => set('produtosExpostosCaixa', e.target.value)}
                    placeholder="Ex: Balas, chicletes, chocolates..."
                    className={inputClass}
                  />
                </div>

                <SimNaoToggle
                  pergunta="Existem displays de balas, gomas ou doces?"
                  value={form.outrosDisplaysImpulso}
                  onChange={(v) => set('outrosDisplaysImpulso', v)}
                />
                {form.outrosDisplaysImpulso && (
                  <>
                    <input
                      type="text"
                      value={form.displaysImpulsoMarcas}
                      onChange={(e) => set('displaysImpulsoMarcas', e.target.value)}
                      placeholder="Marcas identificadas (ex: Fini, Trident, Halls)"
                      className={inputClass}
                    />
                    <SimNaoToggle
                      pergunta="Está próxima ao caixa?"
                      value={form.displaysImpulsoProximo}
                      onChange={(v) => set('displaysImpulsoProximo', v)}
                    />
                  </>
                )}

                <OpcoesChips
                  pergunta="Espaço disponível"
                  opcoes={ESPACO_DISPONIVEL}
                  value={form.espacoDisponivel}
                  onChange={(v) => set('espacoDisponivel', v)}
                  colunas={3}
                />
                <OpcoesChips
                  pergunta="Potencial para display"
                  opcoes={POTENCIAL_DISPLAY}
                  value={form.potencialDisplay}
                  onChange={(v) => set('potencialDisplay', v)}
                  colunas={3}
                />
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                    Descreva a oportunidade:
                  </label>
                  <textarea
                    value={form.descricaoOportunidade}
                    onChange={(e) => set('descricaoOportunidade', e.target.value)}
                    placeholder="Ex: Bom fluxo de pessoas ao lado do caixa, balcão com espaço livre à esquerda..."
                    rows={2}
                    className={textareaClass}
                  />
                </div>
              </ChecklistSection>
            </div>
          )}

          {statusEntrada && (
            <div data-fotos="loja" className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
              <PhotoCaptureGrid
                isInoperante={isInoperante}
                tipos={tiposFotoLoja}
                titulo={isInoperante ? undefined : `Fotos da Loja (${tiposFotoLoja.length})`}
                photos={photos}
                onPhotoCaptured={handlePhotoCaptured}
                onPhotoReset={handlePhotoReset}
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="w-full h-14 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-full shadow-m3-2 flex items-center justify-center gap-2.5 disabled:opacity-50 touch-manipulation transition-all"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <span className="truncate">Registrando Auditoria...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 shrink-0" />
                  <span className="truncate">
                    Finalizar Auditoria ({selectedLoja.nome.replace(/ - Estação.*/, '')})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
