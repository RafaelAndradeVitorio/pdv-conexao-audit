import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { LojaInput } from '../../shared/schemas';

export class ErroLoja extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function formatarCnpj(d: string): string {
  const clean = d.replace(/\D/g, '');
  if (clean.length !== 14) return d;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

export const CNPJ_NAO_INFORMADO = 'CNPJ não informado';

export class LojasService {
  private async proximoId(): Promise<string> {
    const lojas = await prisma.loja.findMany({ select: { id: true } });
    const maior = lojas
      .map((l) => Number(l.id.replace('loja-', '')))
      .filter(Number.isFinite)
      .reduce((max, n) => Math.max(max, n), 0);
    return `loja-${(maior + 1).toString().padStart(2, '0')}`;
  }

  private async proximoCodigoInterno(): Promise<string> {
    const internas = await prisma.loja.findMany({
      where: { cnpj: { startsWith: '99' } },
      select: { cnpj: true }
    });
    const maior = internas
      .map((l) => Number(l.cnpj.slice(2)))
      .filter(Number.isFinite)
      .reduce((max, n) => Math.max(max, n), 0);
    return `99${(maior + 1).toString().padStart(12, '0')}`;
  }

  async criar(dados: LojaInput) {
    let cnpj: string;
    let cnpjFormatado: string;

    const rawCnpj = (dados.cnpj || '').replace(/\D/g, '').trim();
    if (rawCnpj.length > 0) {
      if (rawCnpj.length !== 14) {
        throw new ErroLoja(400, 'CNPJ deve conter 14 dígitos');
      }
      const existe = await prisma.loja.findUnique({ where: { cnpj: rawCnpj } });
      if (existe) {
        throw new ErroLoja(400, `Já existe uma loja cadastrada com este CNPJ (${formatarCnpj(rawCnpj)} - ${existe.nome})`);
      }
      cnpj = rawCnpj;
      cnpjFormatado = formatarCnpj(rawCnpj);
    } else {
      cnpj = await this.proximoCodigoInterno();
      cnpjFormatado = CNPJ_NAO_INFORMADO;
    }

    const id = await this.proximoId();

    const loja = await prisma.loja.create({
      data: {
        id,
        rede: dados.rede.trim(),
        nome: dados.nome.trim(),
        endereco: dados.endereco.trim(),
        estacaoMetro: dados.estacaoMetro?.trim() || null,
        cnpj,
        cnpjFormatado,
        status: 'PENDENTE'
      }
    });

    return loja;
  }

  async atualizar(id: string, dados: LojaInput) {
    const loja = await prisma.loja.findUnique({ where: { id } });
    if (!loja) {
      throw new ErroLoja(404, 'Loja não encontrada');
    }

    let cnpj = loja.cnpj;
    let cnpjFormatado = loja.cnpjFormatado;

    const rawCnpj = (dados.cnpj || '').replace(/\D/g, '').trim();
    if (rawCnpj.length > 0) {
      if (rawCnpj.length !== 14) {
        throw new ErroLoja(400, 'CNPJ deve conter 14 dígitos');
      }
      const outro = await prisma.loja.findFirst({
        where: { cnpj: rawCnpj, NOT: { id } }
      });
      if (outro) {
        throw new ErroLoja(400, `Já existe outra loja com este CNPJ (${formatarCnpj(rawCnpj)} - ${outro.nome})`);
      }
      cnpj = rawCnpj;
      cnpjFormatado = formatarCnpj(rawCnpj);
    } else if (!loja.cnpj.startsWith('99')) {
      // Se antes tinha CNPJ e agora foi limpo, gera código interno
      cnpj = await this.proximoCodigoInterno();
      cnpjFormatado = CNPJ_NAO_INFORMADO;
    }

    const lojaAtualizada = await prisma.loja.update({
      where: { id },
      data: {
        rede: dados.rede.trim(),
        nome: dados.nome.trim(),
        endereco: dados.endereco.trim(),
        estacaoMetro: dados.estacaoMetro?.trim() || null,
        cnpj,
        cnpjFormatado
      },
      include: {
        auditoria: {
          include: {
            pesquisador: { select: { id: true, nome: true } }
          }
        }
      }
    });

    return {
      id: lojaAtualizada.id,
      rede: lojaAtualizada.rede,
      nome: lojaAtualizada.nome,
      endereco: lojaAtualizada.endereco,
      estacaoMetro: lojaAtualizada.estacaoMetro,
      cnpj: lojaAtualizada.cnpj,
      cnpjFormatado: lojaAtualizada.cnpjFormatado,
      status: lojaAtualizada.status,
      auditadaEm: lojaAtualizada.auditadaEm,
      pesquisadorId: lojaAtualizada.auditoria?.pesquisador?.id || null,
      pesquisadorNome: lojaAtualizada.auditoria?.pesquisador?.nome || null
    };
  }

  async excluir(id: string) {
    const loja = await prisma.loja.findUnique({
      where: { id },
      include: {
        auditoria: {
          include: { fotos: true }
        }
      }
    });

    if (!loja) {
      throw new ErroLoja(404, 'Loja não encontrada');
    }

    await prisma.$transaction(async (tx) => {
      if (loja.auditoria) {
        await tx.foto.deleteMany({
          where: { auditoriaId: loja.auditoria.id }
        });
        await tx.auditoria.delete({
          where: { id: loja.auditoria.id }
        });
      }
      await tx.pesquisadorLoja.deleteMany({
        where: { lojaId: id }
      });
      await tx.loja.delete({
        where: { id }
      });
    });

    return {
      resultado: 'excluido',
      id: loja.id,
      nome: loja.nome
    };
  }
}

export const lojasService = new LojasService();
