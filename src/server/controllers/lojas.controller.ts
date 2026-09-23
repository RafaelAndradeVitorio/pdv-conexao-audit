import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';

export async function listarLojas(req: Request, res: Response) {
  try {
    const { status, rede, search } = req.query;

    const where: Prisma.LojaWhereInput = {};

    if (status && typeof status === 'string' && status !== 'TODOS') {
      where.status = status;
    }

    if (rede && typeof rede === 'string' && rede !== 'TODAS') {
      where.rede = rede;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const termo = search.trim();
      where.OR = [
        { id: { contains: termo, mode: 'insensitive' } },
        { nome: { contains: termo, mode: 'insensitive' } },
        { cnpj: { contains: termo } },
        { cnpjFormatado: { contains: termo } },
        { estacaoMetro: { contains: termo, mode: 'insensitive' } },
        { endereco: { contains: termo, mode: 'insensitive' } }
      ];
    }

    const lojas = await prisma.loja.findMany({
      where,
      include: {
        auditoria: {
          include: {
            pesquisador: {
              select: { id: true, nome: true }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    const resultado = lojas.map((l) => ({
      id: l.id,
      rede: l.rede,
      nome: l.nome,
      endereco: l.endereco,
      estacaoMetro: l.estacaoMetro,
      cnpj: l.cnpj,
      cnpjFormatado: l.cnpjFormatado,
      status: l.status,
      auditadaEm: l.auditadaEm,
      pesquisadorId: l.auditoria?.pesquisador?.id || null,
      pesquisadorNome: l.auditoria?.pesquisador?.nome || null
    }));

    return res.json(resultado);
  } catch (error: unknown) {
    console.error('Erro ao listar lojas:', error);
    return res.status(500).json({ error: 'Erro ao carregar lojas' });
  }
}

export async function obterLojaPorId(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const loja = await prisma.loja.findUnique({
      where: { id },
      include: {
        auditoria: {
          include: {
            pesquisador: true,
            fotos: true
          }
        }
      }
    });

    if (!loja) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    const { auditoria, ...lojaProps } = loja;

    let parsedAuditoria = null;
    if (auditoria) {
      let marcasCoca: string[] = [];
      if (auditoria.marcasCocaPresentes) {
        try {
          const parsed = JSON.parse(auditoria.marcasCocaPresentes);
          marcasCoca = Array.isArray(parsed) ? parsed : [auditoria.marcasCocaPresentes];
        } catch {
          marcasCoca = [auditoria.marcasCocaPresentes];
        }
      }

      parsedAuditoria = {
        ...auditoria,
        marcasCocaPresentes: marcasCoca
      };
    }

    return res.json({
      ...lojaProps,
      auditoria: parsedAuditoria,
      pesquisadorNome: auditoria?.pesquisador?.nome || null
    });
  } catch (error: unknown) {
    console.error('Erro ao buscar loja:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da loja' });
  }
}

export async function resetarLoja(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const loja = await prisma.loja.findUnique({
      where: { id },
      include: { auditoria: true }
    });

    if (!loja) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    if (loja.auditoria) {
      await prisma.foto.deleteMany({
        where: { auditoriaId: loja.auditoria.id }
      });
      await prisma.auditoria.delete({
        where: { id: loja.auditoria.id }
      });
    }

    const lojaAtualizada = await prisma.loja.update({
      where: { id },
      data: {
        status: 'PENDENTE',
        auditadaEm: null,
        pesquisadorId: null
      }
    });

    return res.json({
      message: `Loja ${lojaAtualizada.nome} resetada para PENDENTE com sucesso!`,
      loja: lojaAtualizada
    });
  } catch (error: unknown) {
    console.error('Erro ao resetar loja:', error);
    return res.status(500).json({ error: 'Erro ao resetar auditoria da loja' });
  }
}
