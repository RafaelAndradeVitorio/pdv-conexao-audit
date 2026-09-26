import { RedePDV, StatusLoja, StatusEntrada } from './constants';
import type { MapaBebidaItem } from './schemas';

export interface Pesquisador {
  id: string;
  nome: string;
  telefone: string;
  ativo?: boolean;
  /** true = pode auditar qualquer loja; false = só as de lojaIds */
  todasLojas?: boolean;
  lojaIds?: string[];
  createdAt?: string;
}

/** Visão do coordenador (inclui inativos e contagem de auditorias) */
export interface PesquisadorAdmin extends Pesquisador {
  ativo: boolean;
  todasLojas: boolean;
  lojaIds: string[];
  totalAuditorias: number;
}

export interface Loja {
  id: string;
  rede: RedePDV;
  nome: string;
  endereco: string;
  estacaoMetro?: string | null;
  cnpj: string;
  cnpjFormatado: string;
  status: StatusLoja;
  auditadaEm?: string | null;
  pesquisadorNome?: string | null;
  pesquisadorId?: string | null;
  auditoria?: Auditoria | null;
  createdAt?: string;
}

export interface AuditoriaFoto {
  id: string;
  tipo: string;
  url: string;
  tamanhoBytes?: number | null;
  base64?: string | null;
  driveFileId?: string | null;
  driveUrl?: string | null;
  createdAt?: string;
}

/** Uma geladeira da loja (a loja pode ter várias, cada uma com seu relatório) */
export interface Geladeira {
  id?: string;
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

export interface Auditoria {
  id: string;
  lojaId: string;
  pesquisadorId: string;
  statusEntrada: StatusEntrada;
  justificativaInoperante?: string | null;
  
  // Checklist (quando aberta)
  existeGeladeira?: boolean | null;
  geladeiras?: Geladeira[];

  monsterPresente?: boolean | null;
  /** Derivado: alguma geladeira tem Monster */
  monsterNaGeladeira?: boolean | null;
  marcasCocaPresentes?: string[] | string | null; // JSON no banco

  espacoLivreCaixa?: boolean | null;
  espacoLadoTamanho?: string | null;
  espacoDisponivel?: string | null;
  produtosExpostosCaixa?: string | null;
  boaVisibilidadeCaixa?: boolean | null;
  outrosDisplaysImpulso?: boolean | null;
  displaysImpulsoMarcas?: string | null;
  displaysImpulsoProximo?: boolean | null;
  potencialDisplay?: string | null;
  descricaoOportunidade?: string | null;

  fotos: AuditoriaFoto[];
  createdAt: string;

  // joins opcionais
  loja?: Loja;
  pesquisador?: Pesquisador;
}

export interface ResumoDashboard {
  totalLojas: number;
  totalConcluidas: number;
  totalInoperantes: number;
  totalPendentes: number;
  percentualConcluido: number;
  porRede: Record<string, { total: number; concluidas: number; inoperantes: number; pendentes: number }>;
  porPesquisador: Record<string, number>;
}
