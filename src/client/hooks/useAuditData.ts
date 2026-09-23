import { useQuery } from '@tanstack/react-query';
import { Pesquisador, Loja, ResumoDashboard } from '../../shared/types';
import type { ResultadosLevantamento } from '../../shared/analytics';
import { fetchCoord } from '../utils/coordApi';

const API_BASE = '/api';

export function usePesquisadores() {
  return useQuery<Pesquisador[]>({
    queryKey: ['pesquisadores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/pesquisadores`);
      if (!res.ok) throw new Error('Falha ao carregar pesquisadores');
      return res.json();
    },
    staleTime: 1000 * 60 * 30 // 30 min
  });
}

export function useLojas(params?: { status?: string; rede?: string; search?: string }) {
  return useQuery<Loja[]>({
    queryKey: ['lojas', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.rede) query.append('rede', params.rede);
      if (params?.search) query.append('search', params.search);

      const res = await fetch(`${API_BASE}/lojas?${query.toString()}`);
      if (!res.ok) throw new Error('Falha ao buscar lojas');
      return res.json();
    },
    staleTime: 1000 * 10 // 10 segundos
  });
}

export function useLoja(id: string | null) {
  return useQuery<Loja>({
    queryKey: ['loja', id],
    queryFn: async () => {
      if (!id) throw new Error('ID da loja é obrigatório');
      const res = await fetchCoord(`${API_BASE}/lojas/${id}`);
      if (!res.ok) throw new Error('Loja não encontrada');
      return res.json();
    },
    enabled: !!id
  });
}

export function useDashboard() {
  return useQuery<ResumoDashboard>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetchCoord(`${API_BASE}/auditorias/dashboard`);
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      return res.json();
    },
    refetchInterval: 10000 // Atualiza a cada 10s automaticamente
  });
}

export function useResultados(enabled = true) {
  return useQuery<ResultadosLevantamento>({
    queryKey: ['resultados'],
    queryFn: async () => {
      const res = await fetchCoord(`${API_BASE}/auditorias/resultados`);
      if (!res.ok) throw new Error('Falha ao carregar resultados do levantamento');
      return res.json();
    },
    enabled,
    refetchInterval: 30000
  });
}
