import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { PesquisadorInputSchema } from '../../shared/schemas';
import { ErroPesquisador, pesquisadoresService } from '../services/pesquisadores.service';

function responderErro(res: Response, error: unknown, contexto: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.issues.map((i) => i.message).join('; '),
      issues: error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }))
    });
  }
  if (error instanceof ErroPesquisador) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(`Erro ao ${contexto}:`, error);
  return res.status(500).json({ error: `Erro ao ${contexto}` });
}

const idParam = (req: Request) => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

/** Lista do app de campo: só ativos, com as lojas liberadas para cada um */
export async function listarPesquisadores(_req: Request, res: Response) {
  try {
    return res.json(await pesquisadoresService.listarAtivos());
  } catch (error) {
    return responderErro(res, error, 'carregar lista de pesquisadores');
  }
}

export async function listarPesquisadoresAdmin(_req: Request, res: Response) {
  try {
    return res.json(await pesquisadoresService.listarTodos());
  } catch (error) {
    return responderErro(res, error, 'carregar pesquisadores');
  }
}

export async function criarPesquisador(req: Request, res: Response) {
  try {
    const dados = PesquisadorInputSchema.parse(req.body);
    return res.status(201).json(await pesquisadoresService.criar(dados));
  } catch (error) {
    return responderErro(res, error, 'cadastrar pesquisador');
  }
}

export async function atualizarPesquisador(req: Request, res: Response) {
  try {
    const dados = PesquisadorInputSchema.parse(req.body);
    return res.json(await pesquisadoresService.atualizar(idParam(req), dados));
  } catch (error) {
    return responderErro(res, error, 'atualizar pesquisador');
  }
}

export async function excluirPesquisador(req: Request, res: Response) {
  try {
    return res.json(await pesquisadoresService.excluir(idParam(req)));
  } catch (error) {
    return responderErro(res, error, 'excluir pesquisador');
  }
}
