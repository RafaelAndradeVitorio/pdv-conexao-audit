import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/researcherStore';
import { useFilaEnvio } from '../hooks/useFilaEnvio';
import { enfileirarEEnviar, descartarDaFila, EnvioPendente, FotoPendente } from '../utils/filaEnvio';
import { gravar, ler, remover } from '../utils/armazenamentoLocal';
import { Loja } from '../../shared/types';
import {
  STATUS_ENTRADA,
  MARCA_VISUAL_GELADEIRA,
  POSSE_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  ABASTECIMENTO_GELADEIRA,
  VISIBILIDADE_MARCAS,
  ESPACO_DISPONIVEL,
  POTENCIAL_DISPLAY,
  MARCAS_COCA_COLA,
  CATEGORIAS_BEBIDA,
  CategoriaBebida,
  MARCAS_POR_CATEGORIA,
  fotosObrigatorias
} from '../../shared/constants';
import { AuditoriaSubmissionSchema, MapaBebidaItem } from '../../shared/schemas';
import { ResearcherSelector } from '../components/ResearcherSelector';
import { StoreSelector } from '../components/StoreSelector';
import { PhotoCaptureGrid, PhotoState } from '../components/PhotoCaptureGrid';
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
  ShoppingBag,
  DollarSign,
  DoorOpen,
  Check,
  GlassWater,
  EyeOff,
  CloudUpload,
  History
} from 'lucide-react';

type Opcao<T extends readonly string[]> = T[number] | null;

interface ChecklistState {
  existeGeladeira: boolean | null;
  marcaVisualGeladeira: Opcao<typeof MARCA_VISUAL_GELADEIRA>;
  posseGeladeira: Opcao<typeof POSSE_GELADEIRA>;

  monsterPresente: boolean | null;
  monsterNaGeladeira: boolean | null;

  mapaBebidas: MapaBebidaItem[];
  marcasCocaPresentes: string[];

  organizacaoGeladeira: Opcao<typeof ORGANIZACAO_GELADEIRA>;
  abastecimentoGeladeira: Opcao<typeof ABASTECIMENTO_GELADEIRA>;
  visibilidadeMarcas: Opcao<typeof VISIBILIDADE_MARCAS>;
  concorrentesMisturados: boolean | null;
  concorrentesDetalhes: string;

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
  marcaVisualGeladeira: null,
  posseGeladeira: null,
  monsterPresente: null,
  monsterNaGeladeira: null,
  mapaBebidas: CATEGORIAS_BEBIDA.map((categoria) => ({ categoria, tem: null, marcas: '', concorrentes: null })),
  marcasCocaPresentes: [],
  organizacaoGeladeira: null,
  abastecimentoGeladeira: null,
  visibilidadeMarcas: null,
  concorrentesMisturados: null,
  concorrentesDetalhes: '',
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
        setStatusEntrada(r.statusEntrada);
        setJustificativaInoperante(r.justificativaInoperante);
        setForm({ ...checklistInicial(), ...r.form });
        setPhotos(r.photos);
        setRascunhoRestaurado(r.salvoEm);
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

  const tiposFoto = statusEntrada
    ? fotosObrigatorias({
        inoperante: isInoperante,
        existeGeladeira: form.existeGeladeira,
        concorrentesMisturados: form.concorrentesMisturados,
        espacoLivreCaixa: form.espacoLivreCaixa
      })
    : [];

  const set = <K extends keyof ChecklistState>(campo: K, valor: ChecklistState[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const setMapa = (categoria: CategoriaBebida, patch: Partial<MapaBebidaItem>) =>
    setForm((prev) => ({
      ...prev,
      mapaBebidas: prev.mapaBebidas.map((m) => (m.categoria === categoria ? { ...m, ...patch } : m))
    }));

  const toggleMarcaCoca = (marca: string) =>
    setForm((prev) => ({
      ...prev,
      marcasCocaPresentes: prev.marcasCocaPresentes.includes(marca)
        ? prev.marcasCocaPresentes.filter((m) => m !== marca)
        : [...prev.marcasCocaPresentes, marca]
    }));

  const toggleMarcaNoMapa = (categoria: CategoriaBebida, marca: string) => {
    const item = form.mapaBebidas.find((m) => m.categoria === categoria);
    const marcasAtuais = (item?.marcas || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const novasMarcas = marcasAtuais.includes(marca)
      ? marcasAtuais.filter((m) => m !== marca)
      : [...marcasAtuais, marca];

    const patch: Partial<MapaBebidaItem> = {
      marcas: novasMarcas.join(', ')
    };

    // Se selecionou concorrente conhecido e campo concorrentes estiver nulo, sugere true
    const eConcorrente = !MARCAS_COCA_COLA.includes(marca as any);
    if (eConcorrente && novasMarcas.includes(marca) && (item?.concorrentes === null || item?.concorrentes === undefined)) {
      patch.concorrentes = true;
    }

    setMapa(categoria, patch);
  };

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
      marcaVisualGeladeira: temGeladeira ? f.marcaVisualGeladeira : null,
      posseGeladeira: temGeladeira ? f.posseGeladeira : null,
      monsterPresente: f.monsterPresente,
      monsterNaGeladeira: f.monsterPresente && temGeladeira ? f.monsterNaGeladeira : f.monsterPresente === false ? false : null,
      mapaBebidas: temGeladeira
        ? f.mapaBebidas.map((m) => ({
            ...m,
            marcas: m.tem ? m.marcas?.trim() || null : null,
            concorrentes: m.tem ? m.concorrentes : null
          }))
        : [],
      marcasCocaPresentes: f.marcasCocaPresentes,
      organizacaoGeladeira: temGeladeira ? f.organizacaoGeladeira : null,
      abastecimentoGeladeira: temGeladeira ? f.abastecimentoGeladeira : null,
      visibilidadeMarcas: temGeladeira ? f.visibilidadeMarcas : null,
      concorrentesMisturados: temGeladeira ? f.concorrentesMisturados : null,
      concorrentesDetalhes: temGeladeira && f.concorrentesMisturados ? texto(f.concorrentesDetalhes) : null,
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
      setSubmitErrors([...new Set(validacao.error.issues.map((i) => i.message))]);
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
              {/* §4 Geladeira */}
              <ChecklistSection icon={<Refrigerator className="w-4 h-4" />} titulo="Geladeira de Bebidas">
                <SimNaoToggle
                  pergunta="Existe geladeira de bebidas?"
                  value={form.existeGeladeira}
                  onChange={(v) => set('existeGeladeira', v)}
                />
                {temGeladeira && (
                  <>
                    <OpcoesChips
                      pergunta="A geladeira possui identificação visual de alguma marca?"
                      opcoes={MARCA_VISUAL_GELADEIRA}
                      value={form.marcaVisualGeladeira}
                      onChange={(v) => set('marcaVisualGeladeira', v)}
                    />
                    <OpcoesChips
                      pergunta="A geladeira aparenta pertencer a:"
                      opcoes={POSSE_GELADEIRA}
                      value={form.posseGeladeira}
                      onChange={(v) => set('posseGeladeira', v)}
                    />
                  </>
                )}
              </ChecklistSection>

              {/* §5 Monster */}
              <ChecklistSection icon={<Zap className="w-4 h-4" />} titulo="Presença de Monster">
                <SimNaoToggle
                  pergunta="Existe Monster na loja?"
                  value={form.monsterPresente}
                  onChange={(v) => set('monsterPresente', v)}
                />
                {form.monsterPresente && temGeladeira && (
                  <SimNaoToggle
                    pergunta="Existe Monster dentro de alguma geladeira?"
                    value={form.monsterNaGeladeira}
                    onChange={(v) => set('monsterNaGeladeira', v)}
                  />
                )}
              </ChecklistSection>

              {/* §6 Mapa de bebidas */}
              <ChecklistSection
                icon={<GlassWater className="w-4 h-4" />}
                titulo={temGeladeira ? 'Mapa de Bebidas da Geladeira' : 'Marcas Coca-Cola na Loja'}
              >
                {temGeladeira && (
                  <div className="space-y-2.5">
                    {form.mapaBebidas.map((item) => (
                      <div
                        key={item.categoria}
                        data-categoria={item.categoria}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F19]/60 space-y-2"
                      >
                        <SimNaoToggle
                          pergunta={item.categoria}
                          value={item.tem}
                          onChange={(v) => setMapa(item.categoria, { tem: v })}
                        />
                        {item.tem && (
                          <div className="pt-1.5 space-y-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                Marcas presentes em {item.categoria} (toque para marcar):
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {(MARCAS_POR_CATEGORIA[item.categoria] || []).map((marca) => {
                                  const selecionadas = (item.marcas || '')
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                                  const selecionada = selecionadas.includes(marca);
                                  return (
                                    <button
                                      key={marca}
                                      type="button"
                                      aria-pressed={selecionada}
                                      onClick={() => toggleMarcaNoMapa(item.categoria, marca)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all touch-manipulation flex items-center gap-1 ${
                                        selecionada
                                          ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                                          : 'bg-white dark:bg-[#131B2B] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                                      }`}
                                    >
                                      <span>{marca}</span>
                                      <span className="text-[10px] font-bold">
                                        {selecionada ? '✓' : '+'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <SimNaoToggle
                              pergunta="Tem concorrentes?"
                              value={item.concorrentes ?? null}
                              onChange={(v) => setMapa(item.categoria, { concorrentes: v })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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

              {/* §7 Organização e exposição */}
              {temGeladeira && (
                <ChecklistSection icon={<ShoppingBag className="w-4 h-4" />} titulo="Organização e Exposição">
                  <OpcoesChips
                    pergunta="Organização"
                    opcoes={ORGANIZACAO_GELADEIRA}
                    value={form.organizacaoGeladeira}
                    onChange={(v) => set('organizacaoGeladeira', v)}
                  />
                  <OpcoesChips
                    pergunta="Abastecimento"
                    opcoes={ABASTECIMENTO_GELADEIRA}
                    value={form.abastecimentoGeladeira}
                    onChange={(v) => set('abastecimentoGeladeira', v)}
                  />
                  <OpcoesChips
                    pergunta="Visibilidade das marcas"
                    opcoes={VISIBILIDADE_MARCAS}
                    value={form.visibilidadeMarcas}
                    onChange={(v) => set('visibilidadeMarcas', v)}
                  />
                  <SimNaoToggle
                    pergunta="Produtos concorrentes misturados?"
                    value={form.concorrentesMisturados}
                    onChange={(v) => set('concorrentesMisturados', v)}
                  />
                  {form.concorrentesMisturados && (
                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                        Quais marcas estão misturadas e onde estão posicionadas?
                      </label>
                      <input
                        type="text"
                        value={form.concorrentesDetalhes}
                        onChange={(e) => set('concorrentesDetalhes', e.target.value)}
                        placeholder="Ex: Pepsi e Guaraná Antarctica na 2ª prateleira..."
                        className={inputClass}
                      />
                    </div>
                  )}
                </ChecklistSection>
              )}

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
            <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
              <PhotoCaptureGrid
                isInoperante={isInoperante}
                tipos={tiposFoto}
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
