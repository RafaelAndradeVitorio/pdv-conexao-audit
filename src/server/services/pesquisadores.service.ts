import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { PesquisadorInput } from '../../shared/schemas';
import { Pesquisador, PesquisadorAdmin } from '../../shared/types';

export class ErroPesquisador extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

const incluir = {
  lojasPermitidas: { select: { lojaId: true } },
  _count: { select: { auditorias: true } }
} satisfies Prisma.PesquisadorInclude;

type PesquisadorComRelacoes = Prisma.PesquisadorGetPayload<{ include: typeof incluir }>;

const paraAdmin = (p: PesquisadorComRelacoes): PesquisadorAdmin => ({
  id: p.id,
  nome: p.nome,
  telefone: p.telefone,
  ativo: p.ativo,
  todasLojas: p.todasLojas,
  lojaIds: p.todasLojas ? [] : p.lojasPermitidas.map((l) => l.lojaId),
  totalAuditorias: p._count.auditorias,
  createdAt: p.createdAt.toISOString()
});

async function validarLojas(lojaIds: string[]) {
  const unicas = [...new Set(lojaIds)];
  if (unicas.length === 0) return unicas;
  const existentes = await prisma.loja.count({ where: { id: { in: unicas } } });
  if (existentes !== unicas.length) throw new ErroPesquisador(400, 'Uma ou mais lojas selecionadas não existem');
  return unicas;
}

async function proximoId(): Promise<string> {
  const ids = await prisma.pesquisador.findMany({ select: { id: true } });
  const maior = ids
    .map((p) => Number(p.id.replace('pesq-', '')))
    .filter(Number.isFinite)
    .reduce((max, n) => Math.max(max, n), 0);
  return `pesq-${(maior + 1).toString().padStart(2, '0')}`;
}

export class PesquisadoresService {
  /** Lista do app de campo: só ativos, com as lojas liberadas */
  async listarAtivos(): Promise<Pesquisador[]> {
    const lista = await prisma.pesquisador.findMany({
      where: { ativo: true },
      include: incluir,
      orderBy: { nome: 'asc' }
    });
    return lista.map((p) => {
      const { totalAuditorias: _t, ...publico } = paraAdmin(p);
      return publico;
    });
  }

  async listarTodos(): Promise<PesquisadorAdmin[]> {
    const lista = await prisma.pesquisador.findMany({ include: incluir, orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] });
    return lista.map(paraAdmin);
  }

  async criar(dados: PesquisadorInput): Promise<PesquisadorAdmin> {
    const lojaIds = dados.todasLojas ? [] : await validarLojas(dados.lojaIds);
    const criado = await prisma.pesquisador.create({
      data: {
        id: await proximoId(),
        nome: dados.nome,
        telefone: dados.telefone,
        ativo: dados.ativo,
        todasLojas: dados.todasLojas,
        lojasPermitidas: { create: lojaIds.map((lojaId) => ({ lojaId })) }
      },
      include: incluir
    });
    return paraAdmin(criado);
  }

  async atualizar(id: string, dados: PesquisadorInput): Promise<PesquisadorAdmin> {
    const existe = await prisma.pesquisador.findUnique({ where: { id } });
    if (!existe) throw new ErroPesquisador(404, 'Pesquisador não encontrado');
    const lojaIds = dados.todasLojas ? [] : await validarLojas(dados.lojaIds);

    const atualizado = await prisma.$transaction(async (tx) => {
      await tx.pesquisadorLoja.deleteMany({ where: { pesquisadorId: id } });
      return tx.pesquisador.update({
        where: { id },
        data: {
          nome: dados.nome,
          telefone: dados.telefone,
          ativo: dados.ativo,
          todasLojas: dados.todasLojas,
          lojasPermitidas: { create: lojaIds.map((lojaId) => ({ lojaId })) }
        },
        include: incluir
      });
    });
    return paraAdmin(atualizado);
  }

  /**
   * Quem já tem auditoria é só desativado (o histórico continua ligado ao nome);
   * quem não tem é apagado de vez.
   */
  async excluir(id: string): Promise<{ resultado: 'excluido' | 'desativado'; totalAuditorias: number }> {
    const p = await prisma.pesquisador.findUnique({ where: { id }, include: incluir });
    if (!p) throw new ErroPesquisador(404, 'Pesquisador não encontrado');

    if (p._count.auditorias > 0) {
      await prisma.pesquisador.update({ where: { id }, data: { ativo: false } });
      return { resultado: 'desativado', totalAuditorias: p._count.auditorias };
    }
    await prisma.pesquisador.delete({ where: { id } });
    return { resultado: 'excluido', totalAuditorias: 0 };
  }

  /** Regra aplicada no envio da auditoria (mesma regra que filtra as lojas no app) */
  async verificarPermissao(
    tx: Prisma.TransactionClient,
    pesquisadorId: string,
    lojaId: string
  ): Promise<void> {
    const p = await tx.pesquisador.findUnique({
      where: { id: pesquisadorId },
      include: { lojasPermitidas: { where: { lojaId }, select: { lojaId: true } } }
    });
    if (!p || !p.ativo) {
      throw new ErroPesquisador(403, 'Pesquisador desativado ou não cadastrado. Fale com o coordenador.');
    }
    if (!p.todasLojas && p.lojasPermitidas.length === 0) {
      throw new ErroPesquisador(403, 'Esta loja não está liberada para você. Fale com o coordenador.');
    }
  }
}

export const pesquisadoresService = new PesquisadoresService();
