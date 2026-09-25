export const REDES_PDV = [
  'Monster Dog',
  'Ponto Alpha',
  'Better Pão de Queijo'
] as const;

export type RedePDV = (typeof REDES_PDV)[number];

export const STATUS_LOJA = {
  PENDENTE: 'PENDENTE',
  CONCLUIDA: 'CONCLUIDA',
  FINALIZADA_INOPERANTE: 'FINALIZADA_INOPERANTE'
} as const;

export type StatusLoja = (typeof STATUS_LOJA)[keyof typeof STATUS_LOJA];

export const STATUS_ENTRADA = {
  ABERTA: 'Loja aberta e operando',
  FECHADA: 'Loja fechada',
  REFORMA: 'Em reforma',
  NAO_LOCALIZADA: 'Não localizada',
  OUTRO: 'Outro'
} as const;

export type StatusEntrada = (typeof STATUS_ENTRADA)[keyof typeof STATUS_ENTRADA];

export const MARCAS_COCA_COLA = [
  'Coca-Cola',
  'Fanta',
  'Sprite',
  'Kuat',
  'Schweppes',
  'Crystal',
  'Del Valle',
  'Ades',
  'Leão',
  'Powerade',
  'Monster',
  'i9',
  'Burn'
] as const;

export type MarcaCocaCola = (typeof MARCAS_COCA_COLA)[number];

// Guia §12: quando não for possível confirmar uma informação, registrar isto
export const NAO_IDENTIFICADO = 'Não foi possível identificar';

export const MARCA_VISUAL_GELADEIRA = [
  'Coca-Cola',
  'Monster',
  'Outra marca',
  'Sem identificação',
  NAO_IDENTIFICADO
] as const;

export const POSSE_GELADEIRA = [
  'Coca-Cola/FEMSA',
  'Monster',
  'Outro fornecedor',
  NAO_IDENTIFICADO
] as const;

// Guia §6 – Mapa de bebidas da geladeira
export const CATEGORIAS_BEBIDA = [
  'Refrigerantes',
  'Água',
  'Energéticos',
  'Isotônicos',
  'Chás',
  'Sucos'
] as const;

export type CategoriaBebida = (typeof CATEGORIAS_BEBIDA)[number];

export const MARCAS_POR_CATEGORIA: Record<CategoriaBebida, readonly string[]> = {
  Refrigerantes: [
    'Coca-Cola',
    'Fanta',
    'Sprite',
    'Kuat',
    'Schweppes',
    'Guaraná Antarctica',
    'Pepsi',
    'Sukita',
    'Dolly'
  ],
  Água: [
    'Crystal',
    'Bonafont',
    'Minalba',
    'Lindoya',
    'Prata'
  ],
  Energéticos: [
    'Monster',
    'Burn',
    'Red Bull',
    'TNT',
    'Baly'
  ],
  Isotônicos: [
    'Powerade',
    'Gatorade',
    'i9'
  ],
  Chás: [
    'Leão / Matte Leão',
    'Ice Tea Lipton',
    'Feel Good'
  ],
  Sucos: [
    'Del Valle',
    'Ades',
    'Maguary',
    'Natural One',
    'Prats'
  ]
};

// Guia §7 – Organização e exposição
export const ORGANIZACAO_GELADEIRA = [
  'Organizada',
  'Pouco organizada'
] as const;

export const ABASTECIMENTO_GELADEIRA = [
  'Cheia',
  'Boa ocupação',
  'Média ocupação',
  'Baixa ocupação',
  'Quase vazia'
] as const;

export const VISIBILIDADE_MARCAS = [
  'Produtos facilmente identificáveis',
  'Produtos parcialmente visíveis',
  'Produtos misturados',
  'Difícil identificar as marcas'
] as const;

// Guia §9 – Caixa e entorno
export const ESPACO_DISPONIVEL = [
  'Bom',
  'Limitado',
  'Insuficiente'
] as const;

export const POTENCIAL_DISPLAY = [
  'Alto',
  'Médio',
  'Baixo'
] as const;

/**
 * Fotos do levantamento (Guia §8, §10, §11 e lista final 01–06).
 * `arquivo` é o nome usado no ZIP e no Google Drive.
 * `quando` define a obrigatoriedade para loja aberta:
 *   sempre | geladeira (existe geladeira) | concorrentes (concorrentes na geladeira) | espaco (espaço livre no caixa)
 * Os ids antigos foram mantidos para não quebrar auditorias já gravadas.
 */
export const TIPOS_FOTO = [
  { id: 'foto_fachada', label: 'Visão geral da loja', dica: 'Área de atendimento, sem expor clientes identificáveis. Se a loja estiver fechada, a fachada.', arquivo: '01 - Visao geral', quando: 'sempre', obrigatoriaInoperante: true },
  { id: 'foto_geladeira', label: 'Geladeira – visão geral', dica: 'Equipamento inteiro, comunicação visual e contexto na loja. (Mostrar organização)', arquivo: '02 - Geladeira', quando: 'geladeira', obrigatoriaInoperante: false },
  { id: 'foto_marcas', label: 'Bebidas e marcas', dica: 'Foto aproximada mostrando as bebidas e marcas presentes.', arquivo: '03 - Bebidas e marcas', quando: 'geladeira', obrigatoriaInoperante: false },
  { id: 'foto_concorrentes', label: 'Concorrentes', dica: 'Foto que permita identificar claramente as marcas concorrentes.', arquivo: '04 - Concorrentes', quando: 'concorrentes', obrigatoriaInoperante: false },
  { id: 'foto_detalhe', label: 'Detalhe da geladeira', dica: 'Ponto relevante: falta de abastecimento, concorrente ocupando espaço, produto mal posicionado...', arquivo: '04b - Detalhe geladeira', quando: 'geladeira', obrigatoriaInoperante: false },
  { id: 'foto_caixa', label: 'Área do caixa – Oportunidade Display', dica: 'Caixa e entorno. Foto da oportunidade para o Display Coca-Cola Vai Até Você (displays de balas, gomas e doces).', arquivo: '05 - Area do caixa', quando: 'sempre', obrigatoriaInoperante: false },
  { id: 'foto_display', label: 'Espaço potencial – geral', dica: 'O espaço para o Display Coca-Cola Vai Até Você dentro do contexto da loja.', arquivo: '06 - Espaco potencial display', quando: 'espaco', obrigatoriaInoperante: false },
  { id: 'foto_display_aproximada', label: 'Espaço potencial – aproximada', dica: 'Onde exatamente o display poderia ser colocado.', arquivo: '06b - Espaco potencial display (aproximada)', quando: 'espaco', obrigatoriaInoperante: false }
] as const;

export type TipoFotoId = (typeof TIPOS_FOTO)[number]['id'];
export type CondicaoFoto = (typeof TIPOS_FOTO)[number]['quando'];

export const NOME_ARQUIVO_FOTO: Record<string, string> = Object.fromEntries(
  TIPOS_FOTO.map((t) => [t.id, t.arquivo])
);

export interface ContextoFotos {
  inoperante: boolean;
  existeGeladeira?: boolean | null;
  concorrentesMisturados?: boolean | null;
  espacoLivreCaixa?: boolean | null;
}

/** Tipos de foto obrigatórios dado o que foi respondido no checklist */
export function fotosObrigatorias(ctx: ContextoFotos): TipoFotoId[] {
  if (ctx.inoperante) {
    return TIPOS_FOTO.filter((t) => t.obrigatoriaInoperante).map((t) => t.id);
  }
  const atende: Record<CondicaoFoto, boolean> = {
    sempre: true,
    geladeira: ctx.existeGeladeira === true,
    concorrentes: ctx.existeGeladeira === true && ctx.concorrentesMisturados === true,
    espaco: ctx.espacoLivreCaixa === true
  };
  return TIPOS_FOTO.filter((t) => atende[t.quando]).map((t) => t.id);
}
