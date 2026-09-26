import type { Auditoria as AuditoriaDb, Geladeira as GeladeiraDb } from '@prisma/client';
import { prisma } from '../db';
import type { GeladeiraAuditada } from '../../shared/analytics';

// Valores gravados antes do formulário seguir os nomes do guia
const VALORES_LEGADOS: Record<string, string> = {
  FEMSA: 'Coca-Cola/FEMSA',
  Outro: 'Outro fornecedor',
  Outra: 'Outra marca'
};

const legado = (v: string | null) => (v ? VALORES_LEGADOS[v] ?? v : null);

export const lerJsonArray = <T>(raw: string | null | undefined): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Geladeira 1 montada a partir dos campos soltos de uma auditoria antiga */
function geladeiraLegada(a: AuditoriaDb): Omit<GeladeiraDb, 'id' | 'auditoriaId' | 'createdAt'> {
  return {
    ordem: 1,
    identificacao: null,
    marcaVisual: a.marcaVisualGeladeira,
    posse: a.posseGeladeira,
    monsterPresente: a.monsterPresente === false ? false : a.monsterNaGeladeira,
    mapaBebidas: a.mapaBebidas,
    organizacao: a.organizacaoGeladeira,
    abastecimento: a.abastecimentoGeladeira,
    visibilidade: a.visibilidadeMarcas,
    concorrentesMisturados: a.concorrentesMisturados,
    concorrentesDetalhes: a.concorrentesDetalhes
  };
}

/**
 * Geladeiras da auditoria, em ordem e com o JSON convertido.
 * Se a auditoria é anterior às várias geladeiras e o backfill ainda não rodou, usa os campos antigos.
 */
export function geladeirasDaAuditoria(
  a: AuditoriaDb & { geladeiras?: Omit<GeladeiraDb, 'auditoriaId' | 'createdAt'>[] }
): GeladeiraAuditada[] {
  if (!a.existeGeladeira) return [];
  const linhas = a.geladeiras?.length ? [...a.geladeiras].sort((x, y) => x.ordem - y.ordem) : [geladeiraLegada(a)];
  return linhas.map((g) => ({
    ordem: g.ordem,
    identificacao: g.identificacao,
    marcaVisual: legado(g.marcaVisual),
    posse: legado(g.posse),
    monsterPresente: g.monsterPresente,
    mapaBebidas: lerJsonArray(g.mapaBebidas),
    organizacao: g.organizacao,
    abastecimento: g.abastecimento,
    visibilidade: g.visibilidade,
    concorrentesMisturados: g.concorrentesMisturados,
    concorrentesDetalhes: g.concorrentesDetalhes
  }));
}

/**
 * Auditorias gravadas antes de existir a tabela de geladeiras: copia os campos antigos
 * para a geladeira 1. Idempotente (só pega auditorias com geladeira e sem nenhuma linha).
 */
export async function backfillGeladeiras(): Promise<number> {
  const antigas = await prisma.auditoria.findMany({
    where: { existeGeladeira: true, geladeiras: { none: {} } }
  });
  for (const a of antigas) {
    await prisma.geladeira.create({ data: { auditoriaId: a.id, ...geladeiraLegada(a) } });
  }
  if (antigas.length) {
    console.log(`[Bootstrap] ${antigas.length} auditoria(s) antiga(s) convertida(s) para "Geladeira 1".`);
  }
  return antigas.length;
}
