import { z } from 'zod';
import {
  REDES_PDV,
  STATUS_LOJA,
  STATUS_ENTRADA,
  MARCA_VISUAL_GELADEIRA,
  POSSE_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  POTENCIAL_DISPLAY,
  MARCAS_COCA_COLA
} from './constants';

export const PesquisadorSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(8, 'Telefone inválido')
});

export const LojaSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  rede: z.enum(REDES_PDV),
  nome: z.string().min(2, 'Nome da loja é obrigatório'),
  endereco: z.string().min(5, 'Endereço é obrigatório'),
  estacaoMetro: z.string().optional().nullable(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos'),
  cnpjFormatado: z.string().min(18, 'CNPJ formatado inválido'),
  status: z.enum([STATUS_LOJA.PENDENTE, STATUS_LOJA.CONCLUIDA, STATUS_LOJA.FINALIZADA_INOPERANTE])
});

export const CnpjInputSchema = z.string().refine((val) => {
  const clean = val.replace(/\D/g, '');
  return clean.length === 14;
}, {
  message: 'CNPJ deve conter 14 dígitos numéricos válidos (com ou sem pontuação)'
});

export const UploadFotoSchema = z.object({
  cnpj: z.string({ required_error: 'CNPJ é obrigatório para identificação da loja' })
    .min(1, 'CNPJ é obrigatório para identificação da loja'),
  tipo: z.string({ required_error: 'Tipo de foto é obrigatório' })
    .min(1, 'Tipo de foto é obrigatório'),
  base64: z.string().min(1, 'Foto é obrigatória').optional()
});

export const AuditoriaFotoInputSchema = z.object({
  tipo: z.string().min(1, 'Tipo de foto é obrigatório'),
  url: z.string().min(1, 'URL da foto é obrigatória'),
  tamanhoBytes: z.number().nonnegative().optional()
});

export type AuditoriaFotoInput = z.infer<typeof AuditoriaFotoInputSchema>;

export const AuditoriaSubmissionSchema = z.object({
  lojaId: z.string().min(1, 'Selecione uma loja válida'),
  pesquisadorId: z.string().min(1, 'Selecione o pesquisador'),
  statusEntrada: z.enum([
    STATUS_ENTRADA.ABERTA,
    STATUS_ENTRADA.FECHADA,
    STATUS_ENTRADA.REFORMA,
    STATUS_ENTRADA.NAO_LOCALIZADA
  ]),

  // Campo condicional para loja inoperante
  justificativaInoperante: z.string().optional().nullable(),

  // Campos para loja aberta
  existeGeladeira: z.boolean().optional().nullable(),
  marcaVisualGeladeira: z.enum(MARCA_VISUAL_GELADEIRA).optional().nullable(),
  posseGeladeira: z.enum(POSSE_GELADEIRA).optional().nullable(),
  organizacaoGeladeira: z.enum(ORGANIZACAO_GELADEIRA).optional().nullable(),

  monsterPresente: z.boolean().optional().nullable(),
  monsterNaGeladeira: z.boolean().optional().nullable(),
  marcasCocaPresentes: z.array(z.string()).optional().default([]),

  concorrentesMisturados: z.boolean().optional().nullable(),
  concorrentesDetalhes: z.string().optional().nullable(),

  espacoLivreCaixa: z.boolean().optional().nullable(),
  espacoLadoTamanho: z.string().optional().nullable(),
  outrosDisplaysImpulso: z.boolean().optional().nullable(),
  potencialDisplay: z.enum(POTENCIAL_DISPLAY).optional().nullable(),
  descricaoOportunidade: z.string().optional().nullable(),

  fotos: z.array(AuditoriaFotoInputSchema)
}).superRefine((data, ctx) => {
  const isOperante = data.statusEntrada === STATUS_ENTRADA.ABERTA;

  if (!isOperante) {
    // Loja inoperante: justificativa obrigatória e Foto 01 (Fachada) obrigatória
    const just = data.justificativaInoperante;
    if (!just || typeof just !== 'string' || just.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para lojas inoperantes/fechadas, informe uma justificativa detalhada (mínimo 5 caracteres)',
        path: ['justificativaInoperante']
      });
    }

    const fotosList = data.fotos as AuditoriaFotoInput[];
    const hasFachada = fotosList.some((f: AuditoriaFotoInput) => f.tipo === 'foto_fachada');
    if (!hasFachada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Foto 01 (Fachada) é obrigatória mesmo para lojas fechadas/inoperantes',
        path: ['fotos']
      });
    }
  } else {
    // Loja aberta: validações completas
    if (data.existeGeladeira === undefined || data.existeGeladeira === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe se existe geladeira de bebidas',
        path: ['existeGeladeira']
      });
    }

    if (data.existeGeladeira) {
      if (!data.marcaVisualGeladeira) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione a marca visual da geladeira',
          path: ['marcaVisualGeladeira']
        });
      }
      if (!data.posseGeladeira) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione a posse aparente da geladeira',
          path: ['posseGeladeira']
        });
      }
      if (!data.organizacaoGeladeira) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Classifique a organização e abastecimento da geladeira',
          path: ['organizacaoGeladeira']
        });
      }
    }

    if (data.monsterPresente === undefined || data.monsterPresente === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe se Monster Energy está presente na loja',
        path: ['monsterPresente']
      });
    }

    if (data.concorrentesMisturados === undefined || data.concorrentesMisturados === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe se há concorrentes na geladeira',
        path: ['concorrentesMisturados']
      });
    }

    if (data.espacoLivreCaixa === undefined || data.espacoLivreCaixa === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe se há espaço livre próximo ao caixa',
        path: ['espacoLivreCaixa']
      });
    }

    if (!data.potencialDisplay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Classifique o potencial para o display "Coca-Cola Vai Até Você"',
        path: ['potencialDisplay']
      });
    }

    // 6 fotos obrigatórias para loja aberta
    const fotosRequeridas = [
      'foto_fachada',
      'foto_geladeira',
      'foto_marcas',
      'foto_concorrentes',
      'foto_caixa',
      'foto_display'
    ];

    const fotosList = data.fotos as AuditoriaFotoInput[];
    const fotosPresentes = new Set(fotosList.map((f: AuditoriaFotoInput) => f.tipo));
    for (const req of fotosRequeridas) {
      if (!fotosPresentes.has(req)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Foto obrigatória ausente: ${req}`,
          path: ['fotos']
        });
      }
    }
  }
});

export type AuditoriaSubmissionInput = z.infer<typeof AuditoriaSubmissionSchema>;
