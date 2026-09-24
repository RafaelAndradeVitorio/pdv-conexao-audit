import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pesquisador, PesquisadorAdmin, Loja, ResumoDashboard } from '../../shared/types';
import type { PesquisadorInput, LojaInput } from '../../shared/schemas';
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
    staleTime: 1000 * 60 // 1 min: cadastros feitos pelo coordenador aparecem rápido
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

// ---------------------------------------------------------------------------
// Cadastro de pesquisadores (coordenador)

async function enviarCoord(url: string, method: string, corpo?: unknown) {
  const res = await fetchCoord(url, {
    method,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.error || 'Não foi possível salvar');
  return dados;
}

export function usePesquisadoresAdmin() {
  return useQuery<PesquisadorAdmin[]>({
    queryKey: ['pesquisadoresAdmin'],
    queryFn: async () => {
      const res = await fetchCoord(`${API_BASE}/admin/pesquisadores`);
      if (!res.ok) throw new Error('Falha ao carregar pesquisadores');
      return res.json();
    }
  });
}

export function useSalvarPesquisador() {
  const queryClient = useQueryClient();
  return useMutation<PesquisadorAdmin, Error, { id?: string; dados: PesquisadorInput }>({
    mutationFn: ({ id, dados }) =>
      id
        ? enviarCoord(`${API_BASE}/admin/pesquisadores/${id}`, 'PUT', dados)
        : enviarCoord(`${API_BASE}/admin/pesquisadores`, 'POST', dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisadoresAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadores'] });
    }
  });
}

export function useExcluirPesquisador() {
  const queryClient = useQueryClient();
  return useMutation<{ resultado: 'excluido' | 'desativado'; totalAuditorias: number }, Error, string>({
    mutationFn: (id) => enviarCoord(`${API_BASE}/admin/pesquisadores/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisadoresAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadores'] });
    }
  });
}

// ---------------------------------------------------------------------------
// Gestão de lojas (coordenador)

export function useSalvarLoja() {
  const queryClient = useQueryClient();
  return useMutation<Loja, Error, { id?: string; dados: LojaInput }>({
    mutationFn: ({ id, dados }) =>
      id
        ? enviarCoord(`${API_BASE}/admin/lojas/${id}`, 'PUT', dados)
        : enviarCoord(`${API_BASE}/admin/lojas`, 'POST', dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['resultados'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadoresAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadores'] });
    }
  });
}

export function useExcluirLoja() {
  const queryClient = useQueryClient();
  return useMutation<{ resultado: 'excluido'; id: string; nome: string }, Error, string>({
    mutationFn: (id) => enviarCoord(`${API_BASE}/admin/lojas/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['resultados'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadoresAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisadores'] });
    }
  });
}

export function useResetarLoja() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; loja: Loja }, Error, string>({
    mutationFn: (id) => enviarCoord(`${API_BASE}/lojas/${id}/reset`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['resultados'] });
    }
  });
}
