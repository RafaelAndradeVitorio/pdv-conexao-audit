import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuditoriaSubmissionSchema } from '../../shared/schemas';
import { auditService, DuplicateAuditError } from '../services/audit.service';
import { storageService } from '../storage/storage.service';
import { prisma } from '../db';

export async function submeterAuditoria(req: Request, res: Response) {
  try {
    const validatedData = AuditoriaSubmissionSchema.parse(req.body);
    const resultado = await auditService.submitAudit(validatedData);
    return res.status(201).json({
      message: 'Auditoria enviada com sucesso!',
      auditoria: resultado
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Erro de validação do formulário',
        issues: error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message
        }))
      });
    }

    if (error instanceof DuplicateAuditError) {
      return res.status(409).json({
        error: error.message,
        lojaNome: error.lojaNome,
        pesquisadorNome: error.pesquisadorNome,
        auditadaEm: error.auditadaEm
      });
    }

    console.error('Erro ao submeter auditoria:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno ao salvar auditoria';
    return res.status(500).json({ error: msg });
  }
}

export async function uploadFoto(req: Request, res: Response) {
  try {
    let cnpj: string | undefined;
    let tipo: string | undefined;
    let buffer: Buffer | undefined;

    if (req.file) {
      cnpj = req.body.cnpj;
      tipo = req.body.tipo;
      buffer = req.file.buffer;
    } else if (req.body && req.body.base64) {
      cnpj = req.body.cnpj;
      tipo = req.body.tipo;
      const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!cnpj || !tipo || !buffer) {
      return res.status(400).json({
        error: 'Requisição inválida: CNPJ, tipo e foto (arquivo ou base64) são obrigatórios'
      });
    }

    const resultado = await storageService.savePhoto(cnpj, tipo, buffer, 'webp');
    return res.status(201).json({
      url: resultado.url,
      tamanhoBytes: resultado.size
    });
  } catch (error: unknown) {
    console.error('Erro ao processar upload de foto:', error);
    return res.status(500).json({ error: 'Falha ao armazenar foto no servidor' });
  }
}

export async function obterDashboard(_req: Request, res: Response) {
  try {
    const summary = await auditService.getDashboardSummary();
    return res.json(summary);
  } catch (error: unknown) {
    console.error('Erro ao obter dados do dashboard:', error);
    return res.status(500).json({ error: 'Erro ao consolidar métricas do dashboard' });
  }
}

export async function obterAuditoriaPorId(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const auditoria = await prisma.auditoria.findUnique({
      where: { id },
      include: {
        loja: true,
        pesquisador: true,
        fotos: true
      }
    });

    if (!auditoria) {
      return res.status(404).json({ error: 'Auditoria não encontrada' });
    }

    return res.json(auditoria);
  } catch (error: unknown) {
    console.error('Erro ao buscar auditoria:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes da auditoria' });
  }
}
