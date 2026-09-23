import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AuditoriaSubmissionInput } from '../../shared/schemas';
import { STATUS_LOJA, STATUS_ENTRADA } from '../../shared/constants';
import { ResumoDashboard } from '../../shared/types';
import { googleDriveService } from './googleDrive.service';
import { consolidarResultados, LojaAuditada, ResultadosLevantamento } from '../../shared/analytics';

// Valores gravados antes do formulário seguir os nomes do guia
const VALORES_LEGADOS: Record<string, string> = {
  FEMSA: 'Coca-Cola/FEMSA',
  Outro: 'Outro fornecedor',
  Outra: 'Outra marca'
};

const lerJsonArray = <T>(raw: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export class DuplicateAuditError extends Error {
  public statusCode = 409;
  public lojaNome: string;
  public pesquisadorNome: string;
  public auditadaEm: string;
  public pesquisadorId: string | null;

  constructor(lojaNome: string, pesquisadorNome: string, auditadaEm: string, pesquisadorId: string | null = null) {
    super(`Esta loja já foi auditada por ${pesquisadorNome} às ${auditadaEm}`);
    this.name = 'DuplicateAuditError';
    this.lojaNome = lojaNome;
    this.pesquisadorNome = pesquisadorNome;
    this.auditadaEm = auditadaEm;
    this.pesquisadorId = pesquisadorId;
  }
}

export class AuditService {
  /**
   * Salva a auditoria com trava atômica anti-duplicidade em transação
   */
  async submitAudit(data: AuditoriaSubmissionInput) {
    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Busca a loja e verifica se já foi auditada
      const loja = await tx.loja.findUnique({
        where: { id: data.lojaId },
        include: {
          auditoria: {
            include: {
              pesquisador: true
            }
          }
        }
      });

      if (!loja) {
        const error = new Error('Loja não encontrada');
        (error as any).statusCode = 404;
        throw error;
      }

      if (loja.status !== STATUS_LOJA.PENDENTE || loja.auditoria) {
        const pesqNome = loja.auditoria?.pesquisador?.nome || 'Outro pesquisador';
        const dataFormatada = (loja.auditadaEm || loja.auditoria?.createdAt || new Date()).toLocaleString('pt-BR');
        throw new DuplicateAuditError(loja.nome, pesqNome, dataFormatada, loja.auditoria?.pesquisadorId ?? loja.pesquisadorId);
      }

      // 2. Determina o status final da loja
      const isOperante = data.statusEntrada === STATUS_ENTRADA.ABERTA;
      const novoStatusLoja = isOperante
        ? STATUS_LOJA.CONCLUIDA
        : STATUS_LOJA.FINALIZADA_INOPERANTE;

      const agora = new Date();

      // 3. Cria o registro da auditoria
      const auditoria = await tx.auditoria.create({
        data: {
          lojaId: data.lojaId,
          pesquisadorId: data.pesquisadorId,
          statusEntrada: data.statusEntrada,
          justificativaInoperante: data.justificativaInoperante || null,

          existeGeladeira: data.existeGeladeira ?? null,
          marcaVisualGeladeira: data.marcaVisualGeladeira ?? null,
          posseGeladeira: data.posseGeladeira ?? null,
          organizacaoGeladeira: data.organizacaoGeladeira ?? null,
          abastecimentoGeladeira: data.abastecimentoGeladeira ?? null,
          visibilidadeMarcas: data.visibilidadeMarcas ?? null,

          monsterPresente: data.monsterPresente ?? null,
          monsterNaGeladeira: data.monsterNaGeladeira ?? null,
          marcasCocaPresentes: JSON.stringify(data.marcasCocaPresentes || []),
          mapaBebidas: data.mapaBebidas?.length ? JSON.stringify(data.mapaBebidas) : null,

          concorrentesMisturados: data.concorrentesMisturados ?? null,
          concorrentesDetalhes: data.concorrentesDetalhes ?? null,

          espacoLivreCaixa: data.espacoLivreCaixa ?? null,
          espacoLadoTamanho: data.espacoLadoTamanho ?? null,
          espacoDisponivel: data.espacoDisponivel ?? null,
          produtosExpostosCaixa: data.produtosExpostosCaixa ?? null,
          boaVisibilidadeCaixa: data.boaVisibilidadeCaixa ?? null,
          outrosDisplaysImpulso: data.outrosDisplaysImpulso ?? null,
          displaysImpulsoMarcas: data.displaysImpulsoMarcas ?? null,
          displaysImpulsoProximo: data.displaysImpulsoProximo ?? null,
          potencialDisplay: data.potencialDisplay ?? null,
          descricaoOportunidade: data.descricaoOportunidade ?? null,

          createdAt: agora,
          fotos: {
            create: data.fotos.map((f: { tipo: string; url: string; tamanhoBytes?: number; base64?: string }) => ({
              tipo: f.tipo,
              url: f.url,
              tamanhoBytes: f.tamanhoBytes || null,
              base64: f.base64 || null
            }))
          }
        },
        include: {
          fotos: true,
          pesquisador: true,
          loja: true
        }
      });

      // 4. Atualiza o status da loja
      await tx.loja.update({
        where: { id: data.lojaId },
        data: {
          status: novoStatusLoja,
          auditadaEm: agora,
          pesquisadorId: data.pesquisadorId
        }
      });

      return auditoria;
    });

    // Despacha as fotos para a fila assíncrona do Google Drive (não bloqueia resposta)
    googleDriveService.enqueueAuditPhotos(resultado.id).catch((err) => {
      console.error('[GoogleDrive] Erro ao disparar sincronização após auditoria:', err);
    });

    return resultado;
  }

  /**
   * Obtém o resumo métrico consolidado para o dashboard do coordenador
   */
  async getDashboardSummary(): Promise<ResumoDashboard> {
    const totalLojas = await prisma.loja.count();
    const concluidas = await prisma.loja.count({
      where: { status: STATUS_LOJA.CONCLUIDA }
    });
    const inoperantes = await prisma.loja.count({
      where: { status: STATUS_LOJA.FINALIZADA_INOPERANTE }
    });
    const pendentes = await prisma.loja.count({
      where: { status: STATUS_LOJA.PENDENTE }
    });

    const percentualConcluido = totalLojas > 0
      ? Math.round(((concluidas + inoperantes) / totalLojas) * 100)
      : 0;

    const todasLojas = await prisma.loja.findMany({
      include: {
        auditoria: {
          include: {
            pesquisador: true
          }
        }
      }
    });

    const porRede: Record<string, { total: number; concluidas: number; inoperantes: number; pendentes: number }> = {};
    const porPesquisador: Record<string, number> = {};

    for (const loja of todasLojas) {
      if (!porRede[loja.rede]) {
        porRede[loja.rede] = { total: 0, concluidas: 0, inoperantes: 0, pendentes: 0 };
      }
      porRede[loja.rede].total += 1;
      if (loja.status === STATUS_LOJA.CONCLUIDA) porRede[loja.rede].concluidas += 1;
      else if (loja.status === STATUS_LOJA.FINALIZADA_INOPERANTE) porRede[loja.rede].inoperantes += 1;
      else porRede[loja.rede].pendentes += 1;

      if (loja.auditoria?.pesquisador) {
        const nomePesq = loja.auditoria.pesquisador.nome;
        porPesquisador[nomePesq] = (porPesquisador[nomePesq] || 0) + 1;
      }
    }

    return {
      totalLojas,
      totalConcluidas: concluidas,
      totalInoperantes: inoperantes,
      totalPendentes: pendentes,
      percentualConcluido,
      porRede,
      porPesquisador
    };
  }

  /**
   * Consolida as respostas das auditorias para responder às perguntas finais do guia (§13)
   */
  async getResultados(): Promise<ResultadosLevantamento> {
    const lojas = await prisma.loja.findMany({
      include: { auditoria: true },
      orderBy: { id: 'asc' }
    });

    const normalizadas: LojaAuditada[] = lojas.map(({ auditoria: a, ...loja }) => ({
      id: loja.id,
      nome: loja.nome,
      rede: loja.rede,
      status: loja.status,
      auditoria: a && {
        ...a,
        posseGeladeira: a.posseGeladeira ? VALORES_LEGADOS[a.posseGeladeira] ?? a.posseGeladeira : null,
        marcaVisualGeladeira: a.marcaVisualGeladeira
          ? VALORES_LEGADOS[a.marcaVisualGeladeira] ?? a.marcaVisualGeladeira
          : null,
        marcasCocaPresentes: lerJsonArray<string>(a.marcasCocaPresentes),
        mapaBebidas: lerJsonArray(a.mapaBebidas)
      }
    }));

    return consolidarResultados(normalizadas);
  }
}

export const auditService = new AuditService();
