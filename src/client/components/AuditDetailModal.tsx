import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLoja } from '../hooks/useAuditData';
import {
  X,
  Building2,
  Calendar,
  User,
  ExternalLink,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Store,
  Eye,
  Download,
  HardDrive,
  Camera,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { STATUS_LOJA, TIPOS_FOTO } from '../../shared/constants';
import { AuditoriaFoto } from '../../shared/types';

interface AuditDetailModalProps {
  lojaId: string | null;
  onClose: () => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ lojaId, onClose }) => {
  const queryClient = useQueryClient();
  const { data: loja, isLoading, error } = useLoja(lojaId);
  const [activePhoto, setActivePhoto] = useState<AuditoriaFoto | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAudit = async () => {
    if (!lojaId) return;
    const confirmReset = window.confirm(
      `Deseja realmente resetar a auditoria de "${loja?.nome || 'PDV'}" para PENDENTE?\n\nIsso liberará a loja imediatamente no app para um novo teste com fotos.`
    );
    if (!confirmReset) return;

    try {
      setIsResetting(true);
      const res = await fetch(`/api/lojas/${lojaId}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao resetar auditoria da loja');
      await queryClient.invalidateQueries({ queryKey: ['lojas'] });
      await queryClient.invalidateQueries({ queryKey: ['loja', lojaId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      alert(`Loja "${loja?.nome}" resetada com sucesso para PENDENTE!`);
      onClose();
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Falha ao resetar'}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Fecha o modal ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePhoto) {
          setActivePhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, onClose]);

  if (!lojaId) return null;

  const auditoria = loja?.auditoria;
  const isOperante = loja?.status === STATUS_LOJA.CONCLUIDA;

  return (
    <>
      {/* Backdrop Principal */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
        onClick={onClose}
      >
        {/* Container do Modal */}
        <div
          className="relative w-full max-w-4xl bg-white dark:bg-[#131B2B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col font-roboto text-slate-800 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F19]/60 sticky top-0 z-10 gap-3">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/40 mt-0.5">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 shrink-0">
                    {loja?.rede || 'Auditoria de PDV'}
                  </span>
                  {loja && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 ${
                        loja.status === STATUS_LOJA.CONCLUIDA
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40'
                      }`}
                    >
                      {loja.status === STATUS_LOJA.CONCLUIDA ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Concluída (Aberta)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Finalizada Inoperante
                        </>
                      )}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight break-words">
                  {loja?.nome || 'Carregando detalhes...'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  {loja?.estacaoMetro ? `Estação ${loja.estacaoMetro} • ` : ''}
                  CNPJ: <span className="font-mono">{loja?.cnpjFormatado}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Carregando dados completos da auditoria...</p>
              </div>
            ) : error || !loja ? (
              <div className="py-12 text-center text-red-500 text-xs">
                Erro ao carregar dados da auditoria. Tente novamente.
              </div>
            ) : (
              <>
                {/* Metadados da Auditoria (Pesquisador e Horário) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Pesquisador Responsável</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {loja.pesquisadorNome || auditoria?.pesquisador?.nome || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Data e Horário do Envio</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {loja.auditadaEm
                          ? new Date(loja.auditadaEm).toLocaleString('pt-BR')
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Inicial de Entrada */}
                <div className="bg-slate-50 dark:bg-[#0B0F19]/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Status de Entrada no PDV
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    {auditoria?.statusEntrada || 'Não informado'}
                  </div>

                  {auditoria?.justificativaInoperante && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-200 break-words">
                      <span className="font-bold">Justificativa da Inoperação: </span>
                      {auditoria.justificativaInoperante}
                    </div>
                  )}
                </div>

                {/* Checklist de Merchandising (se aberta) */}
                {isOperante && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>1. Geladeiras & Merchandising</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Possui Geladeira?</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.existeGeladeira ? 'Sim' : 'Não'}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Marca Visual</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.marcaVisualGeladeira || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Posse Aparente</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.posseGeladeira || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Abastecimento</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.organizacaoGeladeira || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Presença de Marcas e Concorrentes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Presença Monster</span>
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {auditoria?.monsterPresente ? 'Presente na Loja' : 'Ausente'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          Na geladeira: <strong className="text-slate-900 dark:text-slate-100">{auditoria?.monsterNaGeladeira ? 'Sim' : 'Não'}</strong>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Concorrentes Misturados</span>
                          <span className={`text-[11px] font-semibold ${auditoria?.concorrentesMisturados ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {auditoria?.concorrentesMisturados ? 'Sim (Detectado)' : 'Não'}
                          </span>
                        </div>
                        {auditoria?.concorrentesDetalhes && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 italic break-words">
                            "{auditoria.concorrentesDetalhes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Marcas Coca-Cola Presentes */}
                    {auditoria?.marcasCocaPresentes && auditoria.marcasCocaPresentes.length > 0 && (
                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                        <div className="text-[11px] font-bold uppercase text-slate-500">Marcas Coca-Cola Encontradas</div>
                        <div className="flex flex-wrap gap-1.5">
                          {auditoria.marcasCocaPresentes.map((m: string) => (
                            <span
                              key={m}
                              className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 rounded-full font-medium text-[11px]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Ponto Extra e Display de Impulso */}
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pt-2 flex items-center gap-2">
                      <span>2. Balcão do Caixa & Display de Impulso</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Espaço Livre no Caixa?</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.espacoLivreCaixa ? 'Sim' : 'Não'}
                        </div>
                        {auditoria?.espacoLadoTamanho && (
                          <div className="text-[11px] text-slate-500 mt-1 font-mono break-words">
                            {auditoria.espacoLadoTamanho}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Outros Displays Presentes?</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {auditoria?.outrosDisplaysImpulso ? 'Sim' : 'Não'}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Potencial Display Coca-Cola</div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block font-bold text-xs px-2.5 py-0.5 rounded-full ${
                              auditoria?.potencialDisplay === 'Alto' || auditoria?.potencialDisplay === 'ALTO'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : auditoria?.potencialDisplay === 'Médio' || auditoria?.potencialDisplay === 'MEDIO'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {auditoria?.potencialDisplay || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {auditoria?.descricaoOportunidade && (
                      <div className="bg-slate-50 dark:bg-[#0B0F19]/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Observações da Oportunidade</div>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 italic leading-relaxed break-words">
                          "{auditoria.descricaoOportunidade}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Galeria de Fotos Comprimidas */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>Fotos Registradas ({auditoria?.fotos?.length || 0})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Visualização comprimida para carregamento rápido
                    </span>
                  </div>

                  {!auditoria?.fotos || auditoria.fotos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#0B0F19]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      Nenhuma foto enviada para esta auditoria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {auditoria.fotos.map((foto: AuditoriaFoto) => {
                        const meta = TIPOS_FOTO.find((t) => t.id === foto.tipo);
                        const label = meta ? meta.label : foto.tipo;
                        const sizeKb = foto.tamanhoBytes ? Math.round(foto.tamanhoBytes / 1024) : null;

                        return (
                          <div
                            key={foto.id}
                            className="group relative bg-slate-50 dark:bg-[#0B0F19]/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col transition hover:border-blue-400 dark:hover:border-blue-600"
                          >
                            {/* Imagem com Preview Comprimido */}
                            <div
                              className="relative h-44 w-full bg-slate-100 dark:bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                              onClick={() => setActivePhoto(foto)}
                            >
                              {failedImages[foto.id] ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900/90 text-slate-400 select-none text-center">
                                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                                    <Camera className="w-5 h-5" />
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 line-clamp-1 max-w-[90%]">
                                    {label}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                    Visualização comprimida
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={foto.url}
                                  alt=""
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                  onError={() => setFailedImages((prev) => ({ ...prev, [foto.id]: true }))}
                                />
                              )}

                              {/* Overlay de hover com botão de ampliar */}
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-md flex items-center gap-1.5">
                                  <Maximize2 className="w-3.5 h-3.5" /> Ampliar
                                </span>
                              </div>

                              {/* Badge de tamanho */}
                              {sizeKb && (
                                <span className="absolute bottom-2 right-2 bg-slate-950/70 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                                  {sizeKb} KB
                                </span>
                              )}
                            </div>

                            {/* Detalhes da Foto e Ações */}
                            <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                              <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate" title={label}>
                                {label}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setActivePhoto(foto)}
                                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Ver Foto
                                </button>

                                {foto.driveUrl ? (
                                  <a
                                    href={foto.driveUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1"
                                    title="Abrir foto original no Google Drive"
                                  >
                                    <HardDrive className="w-3 h-3" /> Abrir no Drive <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">
                                    Local
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer do Modal */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F19]/60 flex flex-wrap items-center justify-between text-xs gap-3">
            {loja?.auditoria && (
              <button
                type="button"
                onClick={handleResetAudit}
                disabled={isResetting}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold rounded-full border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 touch-manipulation disabled:opacity-50"
                title="Libera a loja para ser auditada novamente pelo pesquisador"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Resetando...' : 'Liberar PDV para Novo Teste'}</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <span className="text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">Pressione </span><kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">ESC</kbd><span className="hidden sm:inline"> para fechar</span>
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-full transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox em Tela Cheia para Foto Ampliada */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          {/* Botão de Fechar fixo no topo direito para fácil toque em mobile */}
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 z-70 p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition border border-slate-700/60 shadow-lg"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative max-w-4xl w-full flex flex-col items-center my-auto" onClick={(e) => e.stopPropagation()}>
            {failedImages[activePhoto.id] ? (
              <div className="h-64 sm:h-96 w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <Camera className="w-12 h-12 text-blue-400 mb-3" />
                <span className="text-sm font-semibold">{TIPOS_FOTO.find((t) => t.id === activePhoto.tipo)?.label || activePhoto.tipo}</span>
                <span className="text-xs text-slate-400 mt-1">Visualização offline / Armazenado no servidor</span>
              </div>
            ) : (
              <img
                src={activePhoto.url}
                alt=""
                className="max-h-[60vh] sm:max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain border border-slate-700"
                onError={() => setFailedImages((prev) => ({ ...prev, [activePhoto.id]: true }))}
              />
            )}

            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white text-xs max-w-full px-2">
              <span className="font-semibold text-center w-full sm:w-auto px-2 py-0.5">
                {TIPOS_FOTO.find((t) => t.id === activePhoto.tipo)?.label || activePhoto.tipo}
              </span>

              {activePhoto.driveUrl && (
                <a
                  href={activePhoto.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-medium transition shadow-md whitespace-nowrap"
                >
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                  <span>Google Drive</span>
                  <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
                </a>
              )}

              <a
                href={activePhoto.url}
                download
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-medium transition border border-slate-700 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Baixar Imagem</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
