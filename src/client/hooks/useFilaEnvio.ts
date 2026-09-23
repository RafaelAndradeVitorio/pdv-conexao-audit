import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  EVENTO_FILA,
  EnvioPendente,
  descartarDaFila,
  listarFila,
  processarFila
} from '../utils/filaEnvio';

const INTERVALO_REENVIO_MS = 30_000;

/** Auditorias guardadas no aparelho aguardando envio (ou com erro) */
export function useFilaEnvio() {
  const [itens, setItens] = useState<EnvioPendente[]>([]);

  useEffect(() => {
    let ativo = true;
    const recarregar = () =>
      listarFila().then((lista) => {
        if (ativo) setItens(lista.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)));
      });
    recarregar();
    window.addEventListener(EVENTO_FILA, recarregar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_FILA, recarregar);
    };
  }, []);

  return {
    itens,
    aguardando: itens.filter((i) => i.situacao === 'aguardando'),
    comErro: itens.filter((i) => i.situacao === 'erro'),
    reenviar: () => processarFila(true),
    descartar: descartarDaFila
  };
}

/** Reenvio automático: ao abrir o app, quando a conexão volta e a cada 30s. Usar uma vez, no App. */
export function useReenvioAutomatico() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const tentar = () => {
      if (navigator.onLine) processarFila();
    };
    // Lojas enviadas mudam de status na lista
    const atualizarListas = () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['resultados'] });
    };

    tentar();
    window.addEventListener('online', tentar);
    window.addEventListener(EVENTO_FILA, atualizarListas);
    const intervalo = window.setInterval(tentar, INTERVALO_REENVIO_MS);
    return () => {
      window.removeEventListener('online', tentar);
      window.removeEventListener(EVENTO_FILA, atualizarListas);
      window.clearInterval(intervalo);
    };
  }, [queryClient]);
}
