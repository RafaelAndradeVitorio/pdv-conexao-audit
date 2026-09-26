import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../db';
import { LojaInputSchema } from '../../shared/schemas';
import { ErroLoja, lojasService } from '../services/lojas.service';
import { geladeirasDaAuditoria } from '../services/geladeiras';

function responderErro(res: Response, error: unknown, contexto: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.issues.map((i) => i.message).join('; '),
      issues: error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }))
    });
  }
  if (error instanceof ErroLoja) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(`Erro ao ${contexto}:`, error);
  return res.status(500).json({ error: `Erro ao ${contexto}` });
}

const idParam = (req: Request) => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

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
    return responderErro(res, error, 'listar lojas');
  }
}

export async function obterLojaPorId(req: Request, res: Response) {
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const loja = await prisma.loja.findUnique({
      where: { id },
      include: {
        auditoria: {
          include: {
            pesquisador: true,
            fotos: true,
            geladeiras: true
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

      // Remove os campos antigos de geladeira: o que vale é a lista de geladeiras
      const {
        marcaVisualGeladeira: _mv,
        posseGeladeira: _p,
        organizacaoGeladeira: _o,
        abastecimentoGeladeira: _a,
        visibilidadeMarcas: _v,
        mapaBebidas: _m,
        concorrentesMisturados: _c,
        concorrentesDetalhes: _cd,
        ...resto
      } = auditoria;

      parsedAuditoria = {
        ...resto,
        marcasCocaPresentes: marcasCoca,
        geladeiras: geladeirasDaAuditoria(auditoria)
      };
    }

    return res.json({
      ...lojaProps,
      auditoria: parsedAuditoria,
      pesquisadorNome: auditoria?.pesquisador?.nome || null
    });
  } catch (error: unknown) {
    return responderErro(res, error, 'buscar dados da loja');
  }
}

export async function criarLoja(req: Request, res: Response) {
  try {
    const dados = LojaInputSchema.parse(req.body);
    const novaLoja = await lojasService.criar(dados);
    return res.status(201).json(novaLoja);
  } catch (error) {
    return responderErro(res, error, 'cadastrar loja');
  }
}

export async function atualizarLoja(req: Request, res: Response) {
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const dados = LojaInputSchema.parse(req.body);
    const atualizada = await lojasService.atualizar(id, dados);
    return res.json(atualizada);
  } catch (error) {
    return responderErro(res, error, 'atualizar loja');
  }
}

export async function excluirLoja(req: Request, res: Response) {
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const resultado = await lojasService.excluir(id);
    return res.json(resultado);
  } catch (error) {
    return responderErro(res, error, 'excluir loja');
  }
}

export async function resetarLoja(req: Request, res: Response) {
  try {
    const id = idParam(req);
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
    return responderErro(res, error, 'resetar auditoria da loja');
  }
}
