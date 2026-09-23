import React, { useState, useMemo } from 'react';
import { useLojas } from '../hooks/useAuditData';
import { Loja } from '../../shared/types';
import { Search, MapPin, AlertTriangle, CheckCircle2, XCircle, Store, X } from 'lucide-react';

interface Props {
  selectedLoja: Loja | null;
  onSelectLoja: (loja: Loja | null) => void;
}

export const StoreSelector: React.FC<Props> = ({ selectedLoja, onSelectLoja }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: lojas, isLoading } = useLojas();

  const filteredLojas = useMemo(() => {
    if (!lojas) return [];
    if (!searchTerm.trim()) return lojas.slice(0, 10);

    const term = searchTerm.toLowerCase().trim();
    return lojas.filter(
      (l) =>
        l.nome.toLowerCase().includes(term) ||
        l.cnpj.includes(term) ||
        l.cnpjFormatado.includes(term) ||
        (l.estacaoMetro && l.estacaoMetro.toLowerCase().includes(term)) ||
        l.rede.toLowerCase().includes(term)
    );
  }, [lojas, searchTerm]);

  const isLojaBloqueada = (loja: Loja) => {
    return loja.status === 'CONCLUIDA' || loja.status === 'FINALIZADA_INOPERANTE';
  };

  const handleSelect = (loja: Loja) => {
    onSelectLoja(loja);
    setSearchTerm('');
    setIsOpen(false);
  };

  const formatHora = (dataStr?: string | null) => {
    if (!dataStr) return 'horário não registrado';
    return new Date(dataStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    // Android M3 Card - Paleta Coesa e Agradável
    <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm mb-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <label className="text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide flex items-center gap-2 font-roboto min-w-0">
          <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <span className="leading-tight">Seleção do PDV (57 Lojas RMSP)</span>
        </label>
        {selectedLoja && (
          <button
            onClick={() => onSelectLoja(null)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium px-2.5 py-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
          >
            Trocar Loja
          </button>
        )}
      </div>

      {/* Caixa de Busca com Autocomplete (Android M3 Search Bar - rounded-full, 56dp) */}
      {!selectedLoja ? (
        <div className="relative">
          <div className="relative flex items-center">
            <Search
              className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Digite o CNPJ, Nome da Loja ou Estação de Metrô..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full h-14 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-full pl-12 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm transition-all touch-manipulation font-roboto"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-30 left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-white dark:bg-[#161F2E] border border-slate-200 dark:border-slate-700 rounded-3xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800 p-1.5">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500">Carregando lista de lojas...</div>
              ) : filteredLojas.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Nenhum PDV encontrado para "{searchTerm}".</div>
              ) : (
                filteredLojas.map((loja) => {
                  const bloqueada = isLojaBloqueada(loja);
                  return (
                    <button
                      key={loja.id}
                      type="button"
                      onClick={() => handleSelect(loja)}
                      className={`w-full text-left p-3 sm:p-3.5 rounded-2xl flex items-start justify-between gap-2.5 sm:gap-3 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors ${
                        bloqueada ? 'opacity-85 bg-slate-50/50 dark:bg-[#0B0F19]/40' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{loja.nome}</span>
                          <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium shrink-0">
                            {loja.rede}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mb-0.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span className="truncate">{loja.endereco}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          CNPJ: {loja.cnpjFormatado}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {bloqueada ? (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 sm:px-2.5 py-1 rounded-full border border-rose-200/80 dark:border-rose-800/40 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5 shrink-0" /> Já Auditada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 sm:px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/40 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Disponível
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        /* Cartão de Loja Selecionada com Validação Anti-Duplicidade */
        <div className="space-y-3">
          <div className="bg-slate-50/80 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{selectedLoja.rede}</span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{selectedLoja.cnpjFormatado}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 break-words">{selectedLoja.nome}</h2>
            <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 break-words">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span className="min-w-0">{selectedLoja.endereco}</span>
            </div>
          </div>

          {/* ALERTA CRÍTICO: TRAVA ANTI-DUPLICIDADE (Tons Suaves e Coesos) */}
          {isLojaBloqueada(selectedLoja) ? (
            <div className="p-3.5 sm:p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-900 dark:text-rose-200 flex items-start gap-2.5 sm:gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100 mb-1 break-words">Atenção: PDV Já Auditado!</h4>
                <p className="text-xs font-medium text-rose-800 dark:text-rose-200/90 leading-relaxed break-words">
                  Esta loja já foi auditada por <strong className="font-bold underline">{selectedLoja.pesquisadorNome || 'Outro Pesquisador'}</strong> às <strong className="font-bold underline">{formatHora(selectedLoja.auditadaEm)}</strong>.
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-2 break-words">
                  Por regras de compliance de campo, não é permitido reenviar dados para uma loja já concluída. Por favor, selecione outro PDV pendente.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="leading-tight">Loja liberada para auditoria de campo. Prossiga com o preenchimento abaixo.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
