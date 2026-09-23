import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2 } from 'lucide-react';
import { CoordinatorDashboard } from './CoordinatorDashboard';
import { EVENTO_SESSAO_EXPIRADA } from '../utils/coordApi';

interface Sessao {
  pinConfigurado: boolean;
  autenticado: boolean;
}

/** Pede o PIN do coordenador (COORD_PIN) antes de mostrar o painel */
export const CoordinatorGate: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: sessao, isLoading, isError, refetch } = useQuery<Sessao>({
    queryKey: ['coordSessao'],
    queryFn: async () => {
      const res = await fetch('/api/coord/sessao');
      if (!res.ok) throw new Error('Falha ao verificar a sessão');
      return res.json();
    }
  });

  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const aoExpirar = () => refetch();
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, [refetch]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch('/api/coord/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(dados.error || 'Não foi possível entrar');
        return;
      }
      setPin('');
      await refetch();
      queryClient.invalidateQueries();
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const sair = async () => {
    await fetch('/api/coord/sair', { method: 'POST' }).catch(() => undefined);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'coordSessao' });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-16">
        <Loader2 className="w-4 h-4 animate-spin" /> Verificando acesso...
      </div>
    );
  }

  if (isError || !sessao) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center text-xs text-slate-500 space-y-3">
        <p>Não foi possível verificar o acesso ao painel.</p>
        <button type="button" onClick={() => refetch()} className="font-semibold underline text-blue-600 dark:text-blue-400">
          Tentar de novo
        </button>
      </div>
    );
  }

  if (sessao.pinConfigurado && !sessao.autenticado) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <form
          onSubmit={entrar}
          className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Painel do Coordenador</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Digite o PIN de acesso</p>
            </div>
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            aria-label="PIN do coordenador"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full h-12 bg-slate-50/70 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-base tracking-[0.3em] text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
            autoFocus
          />
          {erro && <p className="text-xs text-rose-600 dark:text-rose-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando || !pin}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full disabled:opacity-50 transition"
          >
            {enviando ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return <CoordinatorDashboard onSair={sessao.pinConfigurado ? sair : undefined} />;
};
