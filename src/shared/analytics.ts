import {
  ABASTECIMENTO_GELADEIRA,
  CATEGORIAS_BEBIDA,
  MARCAS_COCA_COLA,
  ORGANIZACAO_GELADEIRA,
  POSSE_GELADEIRA,
  POTENCIAL_DISPLAY,
  ESPACO_DISPONIVEL,
  VISIBILIDADE_MARCAS,
  MARCA_VISUAL_GELADEIRA,
  STATUS_LOJA
} from './constants';
import type { MapaBebidaItem } from './schemas';

/**
 * Nota de exposição da geladeira (0–100).
 * PROVISÓRIA: os pesos precisam ser validados com o cliente antes de apresentar o ranking.
 * Lojas sem geladeira não recebem nota (a ausência de geladeira já é uma oportunidade).
 */
export const PESOS_NOTA = {
  organizacao: { Organizada: 25, 'Pouco organizada': 0 },
  abastecimento: { Cheia: 30, 'Boa ocupação': 22.5, 'Média ocupação': 15, 'Baixa ocupação': 7.5, 'Quase vazia': 0 },
  visibilidade: {
    'Produtos facilmente identificáveis': 30,
    'Produtos parcialmente visíveis': 20,
    'Produtos misturados': 10,
    'Difícil identificar as marcas': 0
  },
  semConcorrentes: 15
} as const;

const GELADEIRA_FEMSA = 'Coca-Cola/FEMSA';

/** Linha de loja com auditoria já com JSONs convertidos (formato de GET /lojas/:id) */
export interface LojaAuditada {
  id: string;
  nome: string;
  rede: string;
  status: string;
  auditoria: {
    existeGeladeira?: boolean | null;
    marcaVisualGeladeira?: string | null;
    posseGeladeira?: string | null;
    organizacaoGeladeira?: string | null;
    abastecimentoGeladeira?: string | null;
    visibilidadeMarcas?: string | null;
    monsterPresente?: boolean | null;
    monsterNaGeladeira?: boolean | null;
    marcasCocaPresentes?: string[];
    mapaBebidas?: MapaBebidaItem[];
    concorrentesMisturados?: boolean | null;
    concorrentesDetalhes?: string | null;
    espacoLivreCaixa?: boolean | null;
    espacoLadoTamanho?: string | null;
    espacoDisponivel?: string | null;
    boaVisibilidadeCaixa?: boolean | null;
    potencialDisplay?: string | null;
    descricaoOportunidade?: string | null;
  } | null;
}

export interface LojaRef {
  lojaId: string;
  nome: string;
  rede: string;
}

export interface LinhaRanking extends LojaRef {
  nota: number | null;
  temGeladeira: boolean;
  posse: string | null;
  organizacao: string | null;
  abastecimento: string | null;
  visibilidade: string | null;
  oportunidades: string[];
}

export interface LinhaDisplay extends LojaRef {
  potencial: string;
  espacoDisponivel: string | null;
  espacoLivre: boolean | null;
  boaVisibilidade: boolean | null;
  local: string | null;
  descricao: string | null;
}

export interface LinhaMonster extends LojaRef {
  naGeladeira: boolean | null;
  posseGeladeira: string | null;
  visibilidade: string | null;
}

export type Contagem = { rotulo: string; qtd: number }[];

export interface ResultadosLevantamento {
  totalLojas: number;
  lojasVisitadas: number;
  lojasAbertas: number;
  lojasInoperantes: number;
  geladeiras: {
    comGeladeira: number;
    semGeladeira: number;
    porPosse: Contagem;
    porMarcaVisual: Contagem;
    porOrganizacao: Contagem;
    porAbastecimento: Contagem;
    porVisibilidade: Contagem;
  };
  marcas: {
    cocaCola: Contagem;
    categorias: { categoria: string; tem: number; comConcorrente: number }[];
  };
  concorrenciaFemsa: {
    geladeirasFemsa: number;
    comConcorrentes: number;
    lojas: (LojaRef & { detalhes: string | null })[];
  };
  monster: {
    presente: number;
    naGeladeira: number;
    foraDaGeladeira: number;
    ausente: number;
    lojas: LinhaMonster[];
  };
  ranking: LinhaRanking[];
  display: LinhaDisplay[];
}

export function calcularNotaExposicao(a: NonNullable<LojaAuditada['auditoria']>): number | null {
  if (!a.existeGeladeira) return null;
  const org = PESOS_NOTA.organizacao[a.organizacaoGeladeira as keyof typeof PESOS_NOTA.organizacao];
  const abs = PESOS_NOTA.abastecimento[a.abastecimentoGeladeira as keyof typeof PESOS_NOTA.abastecimento];
  const vis = PESOS_NOTA.visibilidade[a.visibilidadeMarcas as keyof typeof PESOS_NOTA.visibilidade];
  // Auditorias antigas sem os campos do §7 não entram no ranking
  if (org === undefined || abs === undefined || vis === undefined || a.concorrentesMisturados == null) {
    return null;
  }
  return Math.round(org + abs + vis + (a.concorrentesMisturados ? 0 : PESOS_NOTA.semConcorrentes));
}

export function listarOportunidades(a: NonNullable<LojaAuditada['auditoria']>): string[] {
  const ops: string[] = [];
  if (a.existeGeladeira === false) ops.push('Sem geladeira de bebidas');
  if (a.existeGeladeira) {
    if (a.organizacaoGeladeira === 'Pouco organizada') ops.push('Geladeira pouco organizada');
    if (a.abastecimentoGeladeira === 'Baixa ocupação' || a.abastecimentoGeladeira === 'Quase vazia') {
      ops.push('Abastecimento baixo');
    }
    if (a.visibilidadeMarcas === 'Produtos misturados' || a.visibilidadeMarcas === 'Difícil identificar as marcas') {
      ops.push('Marcas pouco visíveis');
    }
    if (a.concorrentesMisturados && a.posseGeladeira === GELADEIRA_FEMSA) ops.push('Concorrentes na geladeira FEMSA');
    else if (a.concorrentesMisturados) ops.push('Concorrentes misturados');
    if (a.monsterPresente && a.monsterNaGeladeira === false) ops.push('Monster fora da geladeira');
  }
  if (a.monsterPresente === false) ops.push('Sem Monster');
  if (a.potencialDisplay === 'Alto' || a.potencialDisplay === 'Médio') {
    ops.push(`Espaço para display (potencial ${a.potencialDisplay.toLowerCase()})`);
  }
  return ops;
}

/** Conta ocorrências mantendo a ordem das opções do guia; valores fora da lista vão ao fim */
function contar(valores: (string | null | undefined)[], ordem: readonly string[]): Contagem {
  const mapa = new Map<string, number>(ordem.map((o) => [o, 0]));
  for (const v of valores) {
    if (!v) continue;
    mapa.set(v, (mapa.get(v) || 0) + 1);
  }
  return [...mapa.entries()].map(([rotulo, qtd]) => ({ rotulo, qtd }));
}

const ref = (l: LojaAuditada): LojaRef => ({ lojaId: l.id, nome: l.nome, rede: l.rede });

export function consolidarResultados(lojas: LojaAuditada[]): ResultadosLevantamento {
  const visitadas = lojas.filter((l) => l.status !== STATUS_LOJA.PENDENTE);
  const abertas = lojas.filter((l) => l.status === STATUS_LOJA.CONCLUIDA && l.auditoria);
  const auds = abertas.map((l) => l.auditoria!);
  const comGeladeira = abertas.filter((l) => l.auditoria!.existeGeladeira);
  const audsGeladeira = comGeladeira.map((l) => l.auditoria!);

  const femsa = comGeladeira.filter((l) => l.auditoria!.posseGeladeira === GELADEIRA_FEMSA);
  const femsaComConcorrentes = femsa.filter((l) => l.auditoria!.concorrentesMisturados);

  const comMonster = abertas.filter((l) => l.auditoria!.monsterPresente);

  const ranking: LinhaRanking[] = abertas
    .map((l) => {
      const a = l.auditoria!;
      return {
        ...ref(l),
        nota: calcularNotaExposicao(a),
        temGeladeira: !!a.existeGeladeira,
        posse: a.posseGeladeira ?? null,
        organizacao: a.organizacaoGeladeira ?? null,
        abastecimento: a.abastecimentoGeladeira ?? null,
        visibilidade: a.visibilidadeMarcas ?? null,
        oportunidades: listarOportunidades(a)
      };
    })
    // Maior nota primeiro; lojas sem nota ao fim, com mais oportunidades antes
    .sort((x, y) => (y.nota ?? -1) - (x.nota ?? -1) || y.oportunidades.length - x.oportunidades.length);

  const ordemPotencial = (p: string) => POTENCIAL_DISPLAY.indexOf(p as (typeof POTENCIAL_DISPLAY)[number]);
  const ordemEspaco = (e: string | null) =>
    e ? ESPACO_DISPONIVEL.indexOf(e as (typeof ESPACO_DISPONIVEL)[number]) : ESPACO_DISPONIVEL.length;

  const display: LinhaDisplay[] = abertas
    .filter((l) => l.auditoria!.potencialDisplay && l.auditoria!.potencialDisplay !== 'Baixo')
    .map((l) => {
      const a = l.auditoria!;
      return {
        ...ref(l),
        potencial: a.potencialDisplay!,
        espacoDisponivel: a.espacoDisponivel ?? null,
        espacoLivre: a.espacoLivreCaixa ?? null,
        boaVisibilidade: a.boaVisibilidadeCaixa ?? null,
        local: a.espacoLadoTamanho ?? null,
        descricao: a.descricaoOportunidade ?? null
      };
    })
    .sort(
      (x, y) =>
        ordemPotencial(x.potencial) - ordemPotencial(y.potencial) ||
        ordemEspaco(x.espacoDisponivel) - ordemEspaco(y.espacoDisponivel)
    );

  return {
    totalLojas: lojas.length,
    lojasVisitadas: visitadas.length,
    lojasAbertas: abertas.length,
    lojasInoperantes: visitadas.length - abertas.length,
    geladeiras: {
      comGeladeira: comGeladeira.length,
      semGeladeira: auds.filter((a) => a.existeGeladeira === false).length,
      porPosse: contar(audsGeladeira.map((a) => a.posseGeladeira), POSSE_GELADEIRA),
      porMarcaVisual: contar(audsGeladeira.map((a) => a.marcaVisualGeladeira), MARCA_VISUAL_GELADEIRA),
      porOrganizacao: contar(audsGeladeira.map((a) => a.organizacaoGeladeira), ORGANIZACAO_GELADEIRA),
      porAbastecimento: contar(audsGeladeira.map((a) => a.abastecimentoGeladeira), ABASTECIMENTO_GELADEIRA),
      porVisibilidade: contar(audsGeladeira.map((a) => a.visibilidadeMarcas), VISIBILIDADE_MARCAS)
    },
    marcas: {
      cocaCola: contar(auds.flatMap((a) => a.marcasCocaPresentes || []), MARCAS_COCA_COLA).sort((x, y) => y.qtd - x.qtd),
      categorias: CATEGORIAS_BEBIDA.map((categoria) => {
        const itens = audsGeladeira
          .map((a) => (a.mapaBebidas || []).find((m) => m.categoria === categoria))
          .filter((m): m is MapaBebidaItem => !!m && m.tem === true);
        return { categoria, tem: itens.length, comConcorrente: itens.filter((m) => m.concorrentes).length };
      })
    },
    concorrenciaFemsa: {
      geladeirasFemsa: femsa.length,
      comConcorrentes: femsaComConcorrentes.length,
      lojas: femsaComConcorrentes.map((l) => ({ ...ref(l), detalhes: l.auditoria!.concorrentesDetalhes ?? null }))
    },
    monster: {
      presente: comMonster.length,
      naGeladeira: comMonster.filter((l) => l.auditoria!.monsterNaGeladeira).length,
      foraDaGeladeira: comMonster.filter((l) => !l.auditoria!.monsterNaGeladeira).length,
      ausente: abertas.filter((l) => l.auditoria!.monsterPresente === false).length,
      lojas: comMonster.map((l) => ({
        ...ref(l),
        naGeladeira: l.auditoria!.monsterNaGeladeira ?? null,
        posseGeladeira: l.auditoria!.posseGeladeira ?? null,
        visibilidade: l.auditoria!.visibilidadeMarcas ?? null
      }))
    },
    ranking,
    display
  };
}
