import { Request, Response } from 'express';
import { prisma } from '../db';

export async function listarPesquisadores(req: Request, res: Response) {
  try {
    const pesquisadores = await prisma.pesquisador.findMany({
      orderBy: { nome: 'asc' }
    });
    return res.json(pesquisadores);
  } catch (error) {
    console.error('Erro ao listar pesquisadores:', error);
    return res.status(500).json({ error: 'Erro ao carregar lista de pesquisadores' });
  }
}
