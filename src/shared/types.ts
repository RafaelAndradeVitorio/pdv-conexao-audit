import { RedePDV, StatusLoja, StatusEntrada, MarcaCocaCola } from './constants';

export interface Pesquisador {
  id: string;
  nome: string;
  telefone: string;
  createdAt?: string;
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

export interface Auditoria {
  id: string;
  lojaId: string;
  pesquisadorId: string;
  statusEntrada: StatusEntrada;
  justificativaInoperante?: string | null;
  
  // Checklist (quando aberta)
  existeGeladeira?: boolean | null;
  marcaVisualGeladeira?: string | null;
  posseGeladeira?: string | null;
  organizacaoGeladeira?: string | null;
  
  monsterPresente?: boolean | null;
  monsterNaGeladeira?: boolean | null;
  marcasCocaPresentes?: string[]; // lista de marcas
  
  concorrentesMisturados?: boolean | null;
  concorrentesDetalhes?: string | null;
  
  espacoLivreCaixa?: boolean | null;
  espacoLadoTamanho?: string | null;
  outrosDisplaysImpulso?: boolean | null;
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
