import React, { useState } from 'react';
import { useAppStore } from '../stores/researcherStore';
import { useSubmitAuditoria } from '../hooks/useAuditData';
import { Loja } from '../../shared/types';
import {
  STATUS_ENTRADA,
  MARCA_VISUAL_GELADEIRA,
  POSSE_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  POTENCIAL_DISPLAY,
  MARCAS_COCA_COLA
} from '../../shared/constants';
import { ResearcherSelector } from '../components/ResearcherSelector';
import { StoreSelector } from '../components/StoreSelector';
import { PhotoCaptureGrid, PhotoState } from '../components/PhotoCaptureGrid';
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
  Check
} from 'lucide-react';

export const ResearcherFlow: React.FC = () => {
  const { pesquisadorId, pesquisadorNome } = useAppStore();
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null);
  
  // Status de Entrada
  const [statusEntrada, setStatusEntrada] = useState<string>(STATUS_ENTRADA.ABERTA);
  const [justificativaInoperante, setJustificativaInoperante] = useState('');

  // Checklist Geladeira
  const [existeGeladeira, setExisteGeladeira] = useState<boolean>(true);
  const [marcaVisualGeladeira, setMarcaVisualGeladeira] = useState<string>('Coca-Cola');
  const [posseGeladeira, setPosseGeladeira] = useState<string>('FEMSA');
  const [organizacaoGeladeira, setOrganizacaoGeladeira] = useState<string>('Cheia');

  // Checklist Monster & Coca-Cola
  const [monsterPresente, setMonsterPresente] = useState<boolean>(true);
  const [monsterNaGeladeira, setMonsterNaGeladeira] = useState<boolean>(true);
  const [marcasCocaPresentes, setMarcasCocaPresentes] = useState<string[]>([
    'Coca-Cola',
    'Fanta',
    'Sprite',
    'Monster'
  ]);

  // Checklist Concorrência
  const [concorrentesMisturados, setConcorrentesMisturados] = useState<boolean>(false);
  const [concorrentesDetalhes, setConcorrentesDetalhes] = useState('');

  // Checklist Área do Caixa & Display
  const [espacoLivreCaixa, setEspacoLivreCaixa] = useState<boolean>(true);
  const [espacoLadoTamanho, setEspacoLadoTamanho] = useState('Lado direito do caixa, ~60cm livres');
  const [outrosDisplaysImpulso, setOutrosDisplaysImpulso] = useState<boolean>(false);
  const [potencialDisplay, setPotencialDisplay] = useState<string>('Alto');
  const [descricaoOportunidade, setDescricaoOportunidade] = useState('');

  // Estado das Fotos
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});

  // Feedback de envio
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const submitMutation = useSubmitAuditoria();

  const isLojaBloqueada = selectedLoja?.status === 'CONCLUIDA' || selectedLoja?.status === 'FINALIZADA_INOPERANTE';
  const isInoperante = statusEntrada !== STATUS_ENTRADA.ABERTA;

  const toggleMarcaCoca = (marca: string) => {
    setMarcasCocaPresentes((prev) =>
      prev.includes(marca) ? prev.filter((m) => m !== marca) : [...prev, marca]
    );
  };

  const handlePhotoUploaded = (
    tipo: string,
    data: { url: string; size: number; previewUrl: string }
  ) => {
    setPhotos((prev) => ({
      ...prev,
      [tipo]: {
        tipo,
        url: data.url,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMessage(null);
    setSubmitErrorMessage(null);

    if (!pesquisadorId) {
      setSubmitErrorMessage('Por favor, selecione quem é o pesquisador responsável no topo da página.');
      return;
    }

    if (!selectedLoja) {
      setSubmitErrorMessage('Por favor, selecione a loja a ser auditada.');
      return;
    }

    if (isLojaBloqueada) {
      setSubmitErrorMessage('Esta loja já foi auditada anteriormente e está bloqueada para envio.');
      return;
    }

    // Validação de fotos
    const fotosArray = Object.values(photos)
      .filter((p) => !!p.url)
      .map((p) => ({
        tipo: p.tipo,
        url: p.url!,
        tamanhoBytes: (p.compressedKb || 300) * 1024,
        base64: p.previewUrl || undefined
      }));

    if (isInoperante) {
      if (!justificativaInoperante || justificativaInoperante.trim().length < 10) {
        setSubmitErrorMessage('Para lojas fechadas/inoperantes, insira uma justificativa com no mínimo 10 caracteres.');
        return;
      }
      const temFotoFachada = fotosArray.some((f) => f.tipo === 'foto_fachada');
      if (!temFotoFachada) {
        setSubmitErrorMessage('A Foto 01 (Fachada) é obrigatória para comprovação da loja inoperante.');
        return;
      }
    } else {
      if (fotosArray.length < 6) {
        setSubmitErrorMessage(`São obrigatórias as 6 fotos do checklist. Foram enviadas ${fotosArray.length} fotos.`);
        return;
      }
    }

    const payload: any = {
      lojaId: selectedLoja.id,
      pesquisadorId,
      statusEntrada,
      justificativaInoperante: isInoperante ? justificativaInoperante : null,
      fotos: fotosArray
    };

    if (!isInoperante) {
      payload.existeGeladeira = existeGeladeira;
      payload.marcaVisualGeladeira = existeGeladeira ? marcaVisualGeladeira : null;
      payload.posseGeladeira = existeGeladeira ? posseGeladeira : null;
      payload.organizacaoGeladeira = existeGeladeira ? organizacaoGeladeira : null;
      payload.monsterPresente = monsterPresente;
      payload.monsterNaGeladeira = monsterPresente ? monsterNaGeladeira : null;
      payload.marcasCocaPresentes = marcasCocaPresentes;
      payload.concorrentesMisturados = concorrentesMisturados;
      payload.concorrentesDetalhes = concorrentesMisturados ? concorrentesDetalhes : null;
      payload.espacoLivreCaixa = espacoLivreCaixa;
      payload.espacoLadoTamanho = espacoLivreCaixa ? espacoLadoTamanho : null;
      payload.outrosDisplaysImpulso = outrosDisplaysImpulso;
      payload.potencialDisplay = potencialDisplay;
      payload.descricaoOportunidade = descricaoOportunidade;
    }

    try {
      await submitMutation.mutateAsync(payload);
      setSubmitSuccessMessage(
        `Auditoria da loja ${selectedLoja.nome} finalizada com sucesso como ${
          isInoperante ? 'FINALIZADA_INOPERANTE' : 'CONCLUIDA'
        }!`
      );
      // Resetar formulário
      setSelectedLoja(null);
      setPhotos({});
      setJustificativaInoperante('');
      setDescricaoOportunidade('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitErrorMessage(err.message || 'Erro ao enviar auditoria.');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 font-roboto">
      {/* Notificação de Sucesso (Android M3 Success Container) */}
      {submitSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl text-emerald-900 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">Auditoria Enviada!</h4>
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

      {/* Notificação de Erro (Android M3 Error Container) */}
      {submitErrorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-3xl text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">Não foi possível enviar</h4>
            <p className="text-xs text-rose-800 dark:text-rose-200/90 mt-0.5">{submitErrorMessage}</p>
          </div>
        </div>
      )}

      {/* 1. Identificação do Pesquisador */}
      <ResearcherSelector />

      {/* 2. Seleção de Loja com Trava Anti-Duplicidade */}
      <StoreSelector selectedLoja={selectedLoja} onSelectLoja={setSelectedLoja} />

      {/* Formulário de Auditoria (Apenas se houver loja selecionada e não bloqueada) */}
      {selectedLoja && !isLojaBloqueada && (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 3. Status de Entrada no PDV */}
          <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
            <label className="text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <DoorOpen className="w-4 h-4" />
              </div>
              Status de Entrada no PDV
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(STATUS_ENTRADA).map(([key, label]) => {
                const isSelected = statusEntrada === label;
                return (
                  <button
                    key={key}
                    type="button"
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

            {/* Justificativa caso inoperante */}
            {isInoperante && (
              <div className="mt-3.5 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  Justificativa da Inoperância (Obrigatória):
                </label>
                <textarea
                  value={justificativaInoperante}
                  onChange={(e) => setJustificativaInoperante(e.target.value)}
                  placeholder="Ex: Loja fechada por grades na estação, obras no mezanino ou quiosque desativado..."
                  rows={3}
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded-2xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none shadow-sm transition"
                  required
                />
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Para lojas inoperantes, tire apenas a <strong>Foto 01 (Fachada)</strong> comprovando a situação e envie.
                </p>
              </div>
            )}
          </div>

          {/* 4. Checklist da Auditoria (Se aberta) */}
          {!isInoperante && (
            <div className="space-y-4">
              
              {/* Geladeira de Bebidas */}
              <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide">
                  <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Refrigerator className="w-4 h-4" />
                  </div>
                  <span>Geladeira de Bebidas</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Existe geladeira no local?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExisteGeladeira(true)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        existeGeladeira
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setExisteGeladeira(false)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        !existeGeladeira
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {existeGeladeira && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Marca Visual da Geladeira:</label>
                      <select
                        value={marcaVisualGeladeira}
                        onChange={(e) => setMarcaVisualGeladeira(e.target.value)}
                        className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600"
                      >
                        {MARCA_VISUAL_GELADEIRA.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Posse Aparente:</label>
                      <select
                        value={posseGeladeira}
                        onChange={(e) => setPosseGeladeira(e.target.value)}
                        className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600"
                      >
                        {POSSE_GELADEIRA.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Organização e Abastecimento:</label>
                      <select
                        value={organizacaoGeladeira}
                        onChange={(e) => setOrganizacaoGeladeira(e.target.value)}
                        className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600"
                      >
                        {ORGANIZACAO_GELADEIRA.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Monster & Marcas Coca-Cola */}
              <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide">
                  <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  Presença Monster & Coca-Cola
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Monster presente na loja?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMonsterPresente(true)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        monsterPresente
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonsterPresente(false)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        !monsterPresente
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {monsterPresente && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Monster gelado na geladeira?</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMonsterNaGeladeira(true)}
                        className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                          monsterNaGeladeira
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonsterNaGeladeira(false)}
                        className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                          !monsterNaGeladeira
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-800 dark:text-slate-200 font-semibold block mb-2.5">
                    Grid de Marcas Coca-Cola Presentes no PDV:
                  </label>
                  {/* Android M3 Filter Chips (Tons Coesos) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MARCAS_COCA_COLA.map((marca) => {
                      const checked = marcasCocaPresentes.includes(marca);
                      return (
                        <button
                          key={marca}
                          type="button"
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
              </div>

              {/* Concorrência */}
              <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide">
                  <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>Concorrência na Geladeira FEMSA</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Concorrentes misturados na geladeira?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConcorrentesMisturados(true)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        concorrentesMisturados
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setConcorrentesMisturados(false)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        !concorrentesMisturados
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {concorrentesMisturados && (
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                      Quais marcas e em qual prateleira?
                    </label>
                    <input
                      type="text"
                      value={concorrentesDetalhes}
                      onChange={(e) => setConcorrentesDetalhes(e.target.value)}
                      placeholder="Ex: Pepsi e Guaraná Antarctica na 2ª prateleira..."
                      className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Área do Caixa & Display "Coca-Cola Vai Até Você" */}
              <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide">
                  <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span>Área do Caixa & Display "Coca-Cola Vai Até Você"</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Espaço livre próximo ao caixa?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEspacoLivreCaixa(true)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        espacoLivreCaixa
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setEspacoLivreCaixa(false)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        !espacoLivreCaixa
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {espacoLivreCaixa && (
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Lado e Dimensões do Espaço:</label>
                    <input
                      type="text"
                      value={espacoLadoTamanho}
                      onChange={(e) => setEspacoLadoTamanho(e.target.value)}
                      placeholder="Ex: Balcão à direita, 50cm livres ao lado da máquina de cartão..."
                      className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600 shadow-sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">Presença de outros displays de impulso?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOutrosDisplaysImpulso(true)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        outrosDisplaysImpulso
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutrosDisplaysImpulso(false)}
                      className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
                        !outrosDisplaysImpulso
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-2">
                    Avaliação de Potencial para o Display "Coca-Cola Vai Até Você":
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {POTENCIAL_DISPLAY.map((pot) => (
                      <button
                        key={pot}
                        type="button"
                        onClick={() => setPotencialDisplay(pot)}
                        className={`py-2.5 text-xs rounded-2xl font-bold border transition-all ${
                          potencialDisplay === pot
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {pot}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                    Descrição da Oportunidade / Observações:
                  </label>
                  <textarea
                    value={descricaoOportunidade}
                    onChange={(e) => setDescricaoOportunidade(e.target.value)}
                    placeholder="Ex: Excelente fluxo de pessoas ao lado do caixa, operador receptivo a novos displays..."
                    rows={2}
                    className="w-full bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600 shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Fotos Obrigatórias com Compressão */}
          <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
            <PhotoCaptureGrid
              cnpj={selectedLoja.cnpj}
              isInoperante={isInoperante}
              photos={photos}
              onPhotoUploaded={handlePhotoUploaded}
              onPhotoReset={handlePhotoReset}
            />
          </div>

          {/* Botão de Envio (Android M3 Extended FAB / Filled Pill Button) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full h-14 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-full shadow-m3-2 flex items-center justify-center gap-2.5 disabled:opacity-50 touch-manipulation transition-all"
            >
              {submitMutation.isPending ? (
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
