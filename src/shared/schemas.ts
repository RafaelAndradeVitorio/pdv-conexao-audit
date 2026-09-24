import { z } from 'zod';
import {
  REDES_PDV,
  STATUS_LOJA,
  STATUS_ENTRADA,
  MARCA_VISUAL_GELADEIRA,
  POSSE_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  ABASTECIMENTO_GELADEIRA,
  VISIBILIDADE_MARCAS,
  ESPACO_DISPONIVEL,
  POTENCIAL_DISPLAY,
  CATEGORIAS_BEBIDA,
  TIPOS_FOTO,
  fotosObrigatorias
} from './constants';

export const PesquisadorSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(8, 'Telefone inválido')
});

/** Cadastro/edição de pesquisador pelo coordenador */
export const PesquisadorInputSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome do pesquisador'),
    telefone: z
      .string()
      .trim()
      .refine((t) => t.replace(/\D/g, '').length >= 10, 'Telefone com DDD (mínimo 10 dígitos)'),
    ativo: z.boolean().optional().default(true),
    todasLojas: z.boolean().default(true),
    lojaIds: z.array(z.string().min(1)).optional().default([])
  })
  .superRefine((d, ctx) => {
    if (!d.todasLojas && d.lojaIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione ao menos uma loja ou marque "Todas as lojas"',
        path: ['lojaIds']
      });
    }
  });

export type PesquisadorInput = z.infer<typeof PesquisadorInputSchema>;

export const LojaSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  rede: z.string().min(1, 'Rede é obrigatória'),
  nome: z.string().min(2, 'Nome da loja é obrigatório'),
  endereco: z.string().min(3, 'Endereço é obrigatório'),
  estacaoMetro: z.string().optional().nullable(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos'),
  cnpjFormatado: z.string().min(1, 'CNPJ formatado é obrigatório'),
  status: z.enum([STATUS_LOJA.PENDENTE, STATUS_LOJA.CONCLUIDA, STATUS_LOJA.FINALIZADA_INOPERANTE])
});

/** Cadastro e edição de loja pelo coordenador */
export const LojaInputSchema = z
  .object({
    rede: z.string().trim().min(2, 'Informe a rede da loja'),
    nome: z.string().trim().min(2, 'Nome da loja deve ter pelo menos 2 caracteres'),
    endereco: z.string().trim().min(3, 'Endereço deve ter pelo menos 3 caracteres'),
    estacaoMetro: z.string().trim().optional().nullable(),
    cnpj: z.string().trim().optional().nullable()
  })
  .superRefine((d, ctx) => {
    if (d.cnpj && d.cnpj.trim().length > 0) {
      const clean = d.cnpj.replace(/\D/g, '');
      if (clean.length !== 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CNPJ deve conter 14 dígitos numéricos',
          path: ['cnpj']
        });
      }
    }
  });

export type LojaInput = z.infer<typeof LojaInputSchema>;

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
  tamanhoBytes: z.number().nonnegative().optional(),
  base64: z.string().optional()
});

export type AuditoriaFotoInput = z.infer<typeof AuditoriaFotoInputSchema>;

export const MapaBebidaItemSchema = z.object({
  categoria: z.enum(CATEGORIAS_BEBIDA),
  tem: z.boolean().nullable(),
  marcas: z.string().optional().nullable(),
  concorrentes: z.boolean().optional().nullable()
});

export type MapaBebidaItem = z.infer<typeof MapaBebidaItemSchema>;

export const JUSTIFICATIVA_MIN = 10;

const nulo = (v: unknown) => v === undefined || v === null;

export const AuditoriaSubmissionSchema = z.object({
  lojaId: z.string().min(1, 'Selecione uma loja válida'),
  pesquisadorId: z.string().min(1, 'Selecione o pesquisador'),
  statusEntrada: z.enum([
    STATUS_ENTRADA.ABERTA,
    STATUS_ENTRADA.FECHADA,
    STATUS_ENTRADA.REFORMA,
    STATUS_ENTRADA.NAO_LOCALIZADA,
    STATUS_ENTRADA.OUTRO
  ]),

  // Loja fechada / em reforma / outro: descrição da situação
  justificativaInoperante: z.string().optional().nullable(),

  // §4 Geladeira
  existeGeladeira: z.boolean().optional().nullable(),
  marcaVisualGeladeira: z.enum(MARCA_VISUAL_GELADEIRA).optional().nullable(),
  posseGeladeira: z.enum(POSSE_GELADEIRA).optional().nullable(),

  // §5 Monster
  monsterPresente: z.boolean().optional().nullable(),
  monsterNaGeladeira: z.boolean().optional().nullable(),

  // §6 Mapa de bebidas + marcas Coca-Cola
  mapaBebidas: z.array(MapaBebidaItemSchema).optional().default([]),
  marcasCocaPresentes: z.array(z.string()).optional().default([]),

  // §7 Organização e exposição
  organizacaoGeladeira: z.enum(ORGANIZACAO_GELADEIRA).optional().nullable(),
  abastecimentoGeladeira: z.enum(ABASTECIMENTO_GELADEIRA).optional().nullable(),
  visibilidadeMarcas: z.enum(VISIBILIDADE_MARCAS).optional().nullable(),
  concorrentesMisturados: z.boolean().optional().nullable(),
  concorrentesDetalhes: z.string().optional().nullable(),

  // §9 Caixa e entorno
  espacoLivreCaixa: z.boolean().optional().nullable(),
  espacoLadoTamanho: z.string().optional().nullable(),
  espacoDisponivel: z.enum(ESPACO_DISPONIVEL).optional().nullable(),
  produtosExpostosCaixa: z.string().optional().nullable(),
  boaVisibilidadeCaixa: z.boolean().optional().nullable(),
  outrosDisplaysImpulso: z.boolean().optional().nullable(),
  displaysImpulsoMarcas: z.string().optional().nullable(),
  displaysImpulsoProximo: z.boolean().optional().nullable(),
  potencialDisplay: z.enum(POTENCIAL_DISPLAY).optional().nullable(),
  descricaoOportunidade: z.string().optional().nullable(),

  fotos: z.array(AuditoriaFotoInputSchema)
}).superRefine((data, ctx) => {
  const exigir = (condicao: boolean, path: string, message: string) => {
    if (condicao) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  };

  const isOperante = data.statusEntrada === STATUS_ENTRADA.ABERTA;

  if (!isOperante) {
    const just = data.justificativaInoperante?.trim() || '';
    exigir(
      just.length < JUSTIFICATIVA_MIN,
      'justificativaInoperante',
      `Descreva a situação da loja (mínimo ${JUSTIFICATIVA_MIN} caracteres)`
    );
  } else {
    exigir(nulo(data.existeGeladeira), 'existeGeladeira', 'Informe se existe geladeira de bebidas');

    if (data.existeGeladeira) {
      exigir(!data.marcaVisualGeladeira, 'marcaVisualGeladeira', 'Informe a identificação visual da geladeira');
      exigir(!data.posseGeladeira, 'posseGeladeira', 'Informe a quem a geladeira aparenta pertencer');
      exigir(!data.organizacaoGeladeira, 'organizacaoGeladeira', 'Avalie a organização da geladeira');
      exigir(!data.abastecimentoGeladeira, 'abastecimentoGeladeira', 'Avalie o abastecimento da geladeira');
      exigir(!data.visibilidadeMarcas, 'visibilidadeMarcas', 'Avalie a visibilidade das marcas');
      exigir(nulo(data.concorrentesMisturados), 'concorrentesMisturados', 'Informe se há produtos concorrentes misturados');
      exigir(
        data.concorrentesMisturados === true && (data.concorrentesDetalhes?.trim().length || 0) < 3,
        'concorrentesDetalhes',
        'Registre quais marcas concorrentes estão misturadas e onde estão'
      );

      for (const categoria of CATEGORIAS_BEBIDA) {
        const item = data.mapaBebidas.find((m) => m.categoria === categoria);
        if (!item || nulo(item.tem)) {
          exigir(true, 'mapaBebidas', `Mapa de bebidas: informe se tem ${categoria}`);
        } else if (item.tem && nulo(item.concorrentes)) {
          exigir(true, 'mapaBebidas', `Mapa de bebidas: informe se há concorrentes em ${categoria}`);
        }
      }
    }

    exigir(nulo(data.monsterPresente), 'monsterPresente', 'Informe se existe Monster na loja');
    exigir(
      data.monsterPresente === true && data.existeGeladeira === true && nulo(data.monsterNaGeladeira),
      'monsterNaGeladeira',
      'Informe se existe Monster dentro de alguma geladeira'
    );

    exigir(nulo(data.espacoLivreCaixa), 'espacoLivreCaixa', 'Informe se existe espaço livre próximo ao caixa');
    exigir(
      data.espacoLivreCaixa === true && nulo(data.boaVisibilidadeCaixa),
      'boaVisibilidadeCaixa',
      'Informe se o espaço tem boa visibilidade para o consumidor'
    );
    exigir(!data.espacoDisponivel, 'espacoDisponivel', 'Classifique o espaço disponível (Bom / Limitado / Insuficiente)');
    exigir(nulo(data.outrosDisplaysImpulso), 'outrosDisplaysImpulso', 'Informe se existe exposição de balas, gomas ou doces');
    exigir(
      data.outrosDisplaysImpulso === true && nulo(data.displaysImpulsoProximo),
      'displaysImpulsoProximo',
      'Informe se a exposição de impulso está próxima ao caixa'
    );
    exigir(!data.potencialDisplay, 'potencialDisplay', 'Classifique o potencial para o Display Coca-Cola Vai Até Você');
  }

  const presentes = new Set(data.fotos.map((f) => f.tipo));
  const obrigatorias = fotosObrigatorias({
    inoperante: !isOperante,
    existeGeladeira: data.existeGeladeira,
    concorrentesMisturados: data.concorrentesMisturados,
    espacoLivreCaixa: data.espacoLivreCaixa
  });
  for (const tipo of obrigatorias) {
    if (!presentes.has(tipo)) {
      const label = TIPOS_FOTO.find((t) => t.id === tipo)?.label || tipo;
      exigir(true, 'fotos', `Foto obrigatória ausente: ${label}`);
    }
  }
});

export type AuditoriaSubmissionInput = z.infer<typeof AuditoriaSubmissionSchema>;
