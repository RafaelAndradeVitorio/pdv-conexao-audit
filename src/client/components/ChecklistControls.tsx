import React from 'react';
import { Check } from 'lucide-react';

const chipBase =
  'text-xs font-semibold rounded-2xl border transition-all touch-manipulation min-w-0 text-left';
const chipOn = 'bg-blue-600 text-white border-blue-600 shadow-sm';
const chipOff =
  'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400';

export const inputClass =
  'w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600 shadow-sm';

export const textareaClass =
  'w-full bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-slate-100 font-medium focus:border-blue-600 shadow-sm';

interface SectionProps {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}

export const ChecklistSection: React.FC<SectionProps> = ({ icon, titulo, children }) => (
  <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
    <div className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide">
      <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
        {icon}
      </div>
      <span>{titulo}</span>
    </div>
    {children}
  </div>
);

interface SimNaoProps {
  pergunta: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}

/** Pergunta Sim/Não que começa sem resposta: o promotor precisa responder */
export const SimNaoToggle: React.FC<SimNaoProps> = ({ pergunta, value, onChange }) => (
  <div data-pergunta={pergunta} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 gap-2">
    <span className="text-xs text-slate-700 dark:text-slate-200 font-medium min-w-0">
      {pergunta}
      {value === null && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {([true, false] as const).map((opcao) => (
        <button
          key={String(opcao)}
          type="button"
          aria-pressed={value === opcao}
          onClick={() => onChange(opcao)}
          className={`px-3.5 sm:px-4 py-1.5 text-xs rounded-full font-semibold transition-all touch-manipulation whitespace-nowrap ${
            value === opcao
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {opcao ? 'Sim' : 'Não'}
        </button>
      ))}
    </div>
  </div>
);

interface OpcoesProps<T extends string> {
  pergunta: string;
  opcoes: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  colunas?: 2 | 3;
}

/** Escolha única entre as opções do guia, sem valor pré-selecionado */
export function OpcoesChips<T extends string>({ pergunta, opcoes, value, onChange, colunas = 2 }: OpcoesProps<T>) {
  return (
    <div data-pergunta={pergunta}>
      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
        {pergunta}
        {value === null && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className={`grid gap-2 ${colunas === 3 ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {opcoes.map((opcao) => {
          const selecionada = value === opcao;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={selecionada}
              onClick={() => onChange(opcao)}
              className={`${chipBase} p-3 flex items-center justify-between ${selecionada ? chipOn : chipOff}`}
            >
              <span className="truncate">{opcao}</span>
              {selecionada && <Check className="w-4 h-4 text-white shrink-0 ml-1.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
