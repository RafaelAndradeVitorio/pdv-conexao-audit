export const EVENTO_SESSAO_EXPIRADA = 'pdv:coord-sessao-expirada';

/** fetch das rotas do coordenador: um 401 avisa a tela de PIN para pedir o PIN de novo */
export async function fetchCoord(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  return res;
}
