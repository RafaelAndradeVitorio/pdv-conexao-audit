import React from 'react';
import { useAppStore } from '../stores/researcherStore';
import { usePesquisadores } from '../hooks/useAuditData';
import { UserCheck, ShieldCheck } from 'lucide-react';

interface Props {
  onSelected?: () => void;
}

export const ResearcherSelector: React.FC<Props> = ({ onSelected }) => {
  const { pesquisadorId, setPesquisador } = useAppStore();
  const { data: pesquisadores, isLoading, error } = usePesquisadores();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) {
      setPesquisador('', '');
      return;
    }
    const found = pesquisadores?.find(p => p.id === id);
    if (found) {
      setPesquisador(found.id, found.nome);
      if (onSelected) onSelected();
    }
  };

  return (
    // Android M3 Card - Paleta Coesa e Agradável
    <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm mb-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <label className="text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide flex items-center gap-2 font-roboto min-w-0">
          <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <span className="leading-tight">Identificação do Pesquisador</span>
        </label>
        {pesquisadorId && (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/40 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Salvo no aparelho
          </span>
        )}
      </div>

      <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-3.5 leading-relaxed font-normal">
        Selecione o seu nome na equipe para associar suas auditorias de campo automaticamente.
      </p>

      {isLoading ? (
        <div className="h-14 bg-slate-100 dark:bg-[#1E293B] rounded-2xl animate-pulse flex items-center px-4 text-slate-500 text-xs">
          Carregando equipe de campo...
        </div>
      ) : error ? (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-800 dark:text-rose-200 font-medium">
          Erro ao carregar pesquisadores. Verifique a conexão com o servidor.
        </div>
      ) : (
        <div className="relative">
          {/* M3 Outlined Select (56dp height, paleta confortável) */}
          <select
            value={pesquisadorId}
            onChange={handleSelect}
            className="w-full h-14 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-4 pr-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium appearance-none cursor-pointer touch-manipulation transition-all shadow-sm truncate"
          >
            <option value="">Selecione quem está em campo...</option>
            {pesquisadores?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.telefone}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            ▼
          </div>
        </div>
      )}
    </div>
  );
};
