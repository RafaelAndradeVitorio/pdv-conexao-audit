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
  NAO_LOCALIZADA: 'Não localizada'
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

export const MARCA_VISUAL_GELADEIRA = [
  'Coca-Cola',
  'Monster',
  'Outra',
  'Sem identificação'
] as const;

export const POSSE_GELADEIRA = [
  'FEMSA',
  'Monster',
  'Outro'
] as const;

export const ORGANIZACAO_GELADEIRA = [
  'Cheia',
  'Boa',
  'Média',
  'Baixa',
  'Quase vazia'
] as const;

export const POTENCIAL_DISPLAY = [
  'Alto',
  'Médio',
  'Baixo'
] as const;

export const TIPOS_FOTO = [
  { id: 'foto_fachada', label: 'Foto 01: Fachada da Loja', obrigatoriaInoperante: true },
  { id: 'foto_geladeira', label: 'Foto 02: Geladeira Fechada', obrigatoriaInoperante: false },
  { id: 'foto_marcas', label: 'Foto 03: Geladeira Aberta (Marcas)', obrigatoriaInoperante: false },
  { id: 'foto_concorrentes', label: 'Foto 04: Concorrentes / Detalhes', obrigatoriaInoperante: false },
  { id: 'foto_caixa', label: 'Foto 05: Área do Caixa', obrigatoriaInoperante: false },
  { id: 'foto_display', label: 'Foto 06: Espaço do Display / Oportunidade', obrigatoriaInoperante: false }
] as const;

export type TipoFotoId = (typeof TIPOS_FOTO)[number]['id'];
