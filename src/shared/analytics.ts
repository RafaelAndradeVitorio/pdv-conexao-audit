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

/** Uma geladeira com o mapa de bebidas já convertido do JSON */
export interface GeladeiraAuditada {
  ordem: number;
  identificacao?: string | null;
  marcaVisual?: string | null;
  posse?: string | null;
  monsterPresente?: boolean | null;
  mapaBebidas?: MapaBebidaItem[];
  organizacao?: string | null;
  abastecimento?: string | null;
  visibilidade?: string | null;
  concorrentesMisturados?: boolean | null;
  concorrentesDetalhes?: string | null;
}

/** Linha de loja com auditoria já com JSONs convertidos (formato de GET /lojas/:id) */
export interface LojaAuditada {
  id: string;
  nome: string;
  rede: string;
  status: string;
  auditoria: {
    existeGeladeira?: boolean | null;
    geladeiras?: GeladeiraAuditada[];
    monsterPresente?: boolean | null;
    marcasCocaPresentes?: string[];
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

/** Referência a uma geladeira específica da loja (null = loja sem geladeira) */
export interface GeladeiraRef extends LojaRef {
  geladeira: number | null;
  /** Quantas geladeiras a loja tem: com uma só, não é preciso dizer "Geladeira 1" */
  totalGeladeiras: number;
  identificacao: string | null;
}

export interface LinhaRanking extends GeladeiraRef {
  nota: number | null;
  temGeladeira: boolean;
  posse: string | null;
  organizacao: string | null;
  abastecimento: string | null;
  visibilidade: string | null;
  oportunidades: string[];
}

export interface LinhaOportunidades extends LojaRef {
  oportunidades: string[];
  /** Menor nota entre as geladeiras da loja (desempate: piores primeiro) */
  pior: number | null;
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
  naGeladeira: boolean;
  /** Em quantas geladeiras da loja há Monster */
  geladeirasComMonster: number;
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
    /** Lojas com ao menos uma geladeira */
    comGeladeira: number;
    semGeladeira: number;
    /** Total de geladeiras avaliadas (base das contagens abaixo) */
    total: number;
    porPosse: Contagem;
    porMarcaVisual: Contagem;
    porOrganizacao: Contagem;
    porAbastecimento: Contagem;
    porVisibilidade: Contagem;
  };
  marcas: {
    cocaCola: Contagem;
    /** Contagem por geladeira */
    categorias: { categoria: string; tem: number; comConcorrente: number }[];
  };
  concorrenciaFemsa: {
    geladeirasFemsa: number;
    comConcorrentes: number;
    lojas: (GeladeiraRef & { detalhes: string | null })[];
  };
  monster: {
    presente: number;
    naGeladeira: number;
    foraDaGeladeira: number;
    ausente: number;
    lojas: LinhaMonster[];
  };
  /** Uma linha por geladeira; lojas sem geladeira entram com uma linha sem nota */
  ranking: LinhaRanking[];
  /** Uma linha por loja, juntando as oportunidades da loja e de cada geladeira */
  oportunidades: LinhaOportunidades[];
  display: LinhaDisplay[];
}

/** "Geladeira 2" (ou "Geladeira 2 – Vertical ao lado do caixa") para listas e relatórios */
export function rotuloGeladeira(g: { geladeira: number | null; identificacao?: string | null }): string {
  if (g.geladeira === null) return 'Sem geladeira';
  return g.identificacao ? `Geladeira ${g.geladeira} – ${g.identificacao}` : `Geladeira ${g.geladeira}`;
}

export function calcularNotaExposicao(g: GeladeiraAuditada): number | null {
  const org = PESOS_NOTA.organizacao[g.organizacao as keyof typeof PESOS_NOTA.organizacao];
  const abs = PESOS_NOTA.abastecimento[g.abastecimento as keyof typeof PESOS_NOTA.abastecimento];
  const vis = PESOS_NOTA.visibilidade[g.visibilidade as keyof typeof PESOS_NOTA.visibilidade];
  // Auditorias antigas sem os campos do §7 não entram no ranking
  if (org === undefined || abs === undefined || vis === undefined || g.concorrentesMisturados == null) {
    return null;
  }
  return Math.round(org + abs + vis + (g.concorrentesMisturados ? 0 : PESOS_NOTA.semConcorrentes));
}

/** Pontos de melhoria de uma geladeira */
export function oportunidadesGeladeira(g: GeladeiraAuditada): string[] {
  const ops: string[] = [];
  if (g.organizacao === 'Pouco organizada') ops.push('Geladeira pouco organizada');
  if (g.abastecimento === 'Baixa ocupação' || g.abastecimento === 'Quase vazia') ops.push('Abastecimento baixo');
  if (g.visibilidade === 'Produtos misturados' || g.visibilidade === 'Difícil identificar as marcas') {
    ops.push('Marcas pouco visíveis');
  }
  if (g.concorrentesMisturados && g.posse === GELADEIRA_FEMSA) ops.push('Concorrentes na geladeira FEMSA');
  else if (g.concorrentesMisturados) ops.push('Concorrentes misturados');
  return ops;
}

/** Pontos de melhoria da loja; os de geladeira levam "Geladeira N:" quando há mais de uma */
export function listarOportunidades(a: NonNullable<LojaAuditada['auditoria']>): string[] {
  const ops: string[] = [];
  const geladeiras = a.existeGeladeira ? a.geladeiras || [] : [];
  if (a.existeGeladeira === false) ops.push('Sem geladeira de bebidas');
  for (const g of geladeiras) {
    const prefixo = geladeiras.length > 1 ? `Geladeira ${g.ordem}: ` : '';
    ops.push(...oportunidadesGeladeira(g).map((o) => prefixo + o));
  }
  if (a.monsterPresente && geladeiras.length > 0 && !geladeiras.some((g) => g.monsterPresente)) {
    ops.push('Monster fora da geladeira');
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

const geladeirasDe = (l: LojaAuditada): GeladeiraAuditada[] =>
  l.auditoria?.existeGeladeira ? l.auditoria.geladeiras || [] : [];

export function consolidarResultados(lojas: LojaAuditada[]): ResultadosLevantamento {
  const visitadas = lojas.filter((l) => l.status !== STATUS_LOJA.PENDENTE);
  const abertas = lojas.filter((l) => l.status === STATUS_LOJA.CONCLUIDA && l.auditoria);
  const auds = abertas.map((l) => l.auditoria!);

  // Cada geladeira com a loja a que pertence
  const geladeiras = abertas.flatMap((l) => {
    const gs = geladeirasDe(l);
    return gs.map((g) => ({
      g,
      ref: {
        ...ref(l),
        geladeira: g.ordem,
        totalGeladeiras: gs.length,
        identificacao: g.identificacao?.trim() || null
      } as GeladeiraRef
    }));
  });
  const lojasComGeladeira = abertas.filter((l) => geladeirasDe(l).length > 0);

  const femsa = geladeiras.filter(({ g }) => g.posse === GELADEIRA_FEMSA);
  const femsaComConcorrentes = femsa.filter(({ g }) => g.concorrentesMisturados);

  const comMonster = abertas.filter((l) => l.auditoria!.monsterPresente);

  const ranking: LinhaRanking[] = [
    ...geladeiras.map(({ g, ref: r }) => ({
      ...r,
      nota: calcularNotaExposicao(g),
      temGeladeira: true,
      posse: g.posse ?? null,
      organizacao: g.organizacao ?? null,
      abastecimento: g.abastecimento ?? null,
      visibilidade: g.visibilidade ?? null,
      oportunidades: oportunidadesGeladeira(g)
    })),
    ...abertas
      .filter((l) => geladeirasDe(l).length === 0)
      .map((l) => ({
        ...ref(l),
        geladeira: null,
        totalGeladeiras: 0,
        identificacao: null,
        nota: null,
        temGeladeira: false,
        posse: null,
        organizacao: null,
        abastecimento: null,
        visibilidade: null,
        oportunidades: l.auditoria!.existeGeladeira === false ? ['Sem geladeira de bebidas'] : []
      }))
  ]
    // Maior nota primeiro; sem nota ao fim, com mais oportunidades antes
    .sort((x, y) => (y.nota ?? -1) - (x.nota ?? -1) || y.oportunidades.length - x.oportunidades.length);

  const oportunidades: LinhaOportunidades[] = abertas
    .map((l) => {
      const notas = geladeirasDe(l)
        .map(calcularNotaExposicao)
        .filter((n): n is number => n !== null);
      return { ...ref(l), oportunidades: listarOportunidades(l.auditoria!), pior: notas.length ? Math.min(...notas) : null };
    })
    .filter((l) => l.oportunidades.length > 0)
    .sort((a, b) => b.oportunidades.length - a.oportunidades.length || (a.pior ?? 101) - (b.pior ?? 101));

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

  const unicos = (valores: (string | null | undefined)[]) => [...new Set(valores.filter(Boolean))].join(', ') || null;
  const linhasMonster: LinhaMonster[] = comMonster.map((l) => {
    const comM = geladeirasDe(l).filter((g) => g.monsterPresente);
    return {
      ...ref(l),
      naGeladeira: comM.length > 0,
      geladeirasComMonster: comM.length,
      posseGeladeira: unicos(comM.map((g) => g.posse)),
      visibilidade: unicos(comM.map((g) => g.visibilidade))
    };
  });

  const gs = geladeiras.map(({ g }) => g);

  return {
    totalLojas: lojas.length,
    lojasVisitadas: visitadas.length,
    lojasAbertas: abertas.length,
    lojasInoperantes: visitadas.length - abertas.length,
    geladeiras: {
      comGeladeira: lojasComGeladeira.length,
      semGeladeira: auds.filter((a) => a.existeGeladeira === false).length,
      total: gs.length,
      porPosse: contar(gs.map((g) => g.posse), POSSE_GELADEIRA),
      porMarcaVisual: contar(gs.map((g) => g.marcaVisual), MARCA_VISUAL_GELADEIRA),
      porOrganizacao: contar(gs.map((g) => g.organizacao), ORGANIZACAO_GELADEIRA),
      porAbastecimento: contar(gs.map((g) => g.abastecimento), ABASTECIMENTO_GELADEIRA),
      porVisibilidade: contar(gs.map((g) => g.visibilidade), VISIBILIDADE_MARCAS)
    },
    marcas: {
      cocaCola: contar(auds.flatMap((a) => a.marcasCocaPresentes || []), MARCAS_COCA_COLA).sort((x, y) => y.qtd - x.qtd),
      categorias: CATEGORIAS_BEBIDA.map((categoria) => {
        const itens = gs
          .map((g) => (g.mapaBebidas || []).find((m) => m.categoria === categoria))
          .filter((m): m is MapaBebidaItem => !!m && m.tem === true);
        return { categoria, tem: itens.length, comConcorrente: itens.filter((m) => m.concorrentes).length };
      })
    },
    concorrenciaFemsa: {
      geladeirasFemsa: femsa.length,
      comConcorrentes: femsaComConcorrentes.length,
      lojas: femsaComConcorrentes.map(({ g, ref: r }) => ({ ...r, detalhes: g.concorrentesDetalhes ?? null }))
    },
    monster: {
      presente: comMonster.length,
      naGeladeira: linhasMonster.filter((l) => l.naGeladeira).length,
      foraDaGeladeira: linhasMonster.filter((l) => !l.naGeladeira).length,
      ausente: abertas.filter((l) => l.auditoria!.monsterPresente === false).length,
      lojas: linhasMonster
    },
    ranking,
    oportunidades,
    display
  };
}
