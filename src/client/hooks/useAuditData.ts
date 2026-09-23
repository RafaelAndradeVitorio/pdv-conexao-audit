import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pesquisador, Loja, ResumoDashboard } from '../../shared/types';
import { AuditoriaSubmissionInput } from '../../shared/schemas';

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
      const res = await fetch(`${API_BASE}/lojas/${id}`);
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
      const res = await fetch(`${API_BASE}/auditorias/dashboard`);
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      return res.json();
    },
    refetchInterval: 10000 // Atualiza a cada 10s automaticamente
  });
}

export function useUploadFoto() {
  return useMutation<{ url: string; tamanhoBytes: number }, Error, { cnpj: string; tipo: string; base64: string }>({
    mutationFn: async ({ cnpj, tipo, base64 }) => {
      const res = await fetch(`${API_BASE}/auditorias/upload-foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, tipo, base64 })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro no upload' }));
        throw new Error(err.error || 'Falha no envio da foto');
      }

      return res.json();
    }
  });
}

export function useSubmitAuditoria() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AuditoriaSubmissionInput>({
    mutationFn: async (dados) => {
      const res = await fetch(`${API_BASE}/auditorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(responseData.error || 'Esta loja já foi auditada por outro pesquisador.');
        }
        if (responseData.issues && Array.isArray(responseData.issues)) {
          const detail = responseData.issues.map((i: any) => i.mensagem).join('; ');
          throw new Error(`Validação: ${detail}`);
        }
        throw new Error(responseData.error || 'Erro ao submeter auditoria');
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}
