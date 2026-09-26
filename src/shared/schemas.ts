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
  MAX_GELADEIRAS,
  chaveTipoFoto,
  lerTipoFoto,
  metaTipoFoto,
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

/** Respostas de uma geladeira (§4 a §7 do guia); a loja pode ter várias */
export const GeladeiraSchema = z.object({
  identificacao: z.string().optional().nullable(),
  marcaVisual: z.enum(MARCA_VISUAL_GELADEIRA).optional().nullable(),
  posse: z.enum(POSSE_GELADEIRA).optional().nullable(),
  monsterPresente: z.boolean().optional().nullable(),
  mapaBebidas: z.array(MapaBebidaItemSchema).optional().default([]),
  organizacao: z.enum(ORGANIZACAO_GELADEIRA).optional().nullable(),
  abastecimento: z.enum(ABASTECIMENTO_GELADEIRA).optional().nullable(),
  visibilidade: z.enum(VISIBILIDADE_MARCAS).optional().nullable(),
  concorrentesMisturados: z.boolean().optional().nullable(),
  concorrentesDetalhes: z.string().optional().nullable()
});

export type GeladeiraInput = z.infer<typeof GeladeiraSchema>;

/** O que ainda falta responder em uma geladeira (usado no envio e no card do pesquisador) */
export function pendenciasGeladeira(g: Partial<GeladeiraInput>): string[] {
  const faltas: string[] = [];
  if (!g.marcaVisual) faltas.push('informe a identificação visual');
  if (!g.posse) faltas.push('informe a quem a geladeira aparenta pertencer');
  if (nulo(g.monsterPresente)) faltas.push('informe se tem Monster nesta geladeira');
  for (const categoria of CATEGORIAS_BEBIDA) {
    const item = (g.mapaBebidas || []).find((m) => m.categoria === categoria);
    if (!item || nulo(item.tem)) faltas.push(`mapa de bebidas: informe se tem ${categoria}`);
    else if (item.tem && nulo(item.concorrentes)) faltas.push(`mapa de bebidas: informe se há concorrentes em ${categoria}`);
  }
  if (!g.organizacao) faltas.push('avalie a organização');
  if (!g.abastecimento) faltas.push('avalie o abastecimento');
  if (!g.visibilidade) faltas.push('avalie a visibilidade das marcas');
  if (nulo(g.concorrentesMisturados)) faltas.push('informe se há produtos concorrentes misturados');
  if (g.concorrentesMisturados === true && (g.concorrentesDetalhes?.trim().length || 0) < 3) {
    faltas.push('registre quais marcas concorrentes estão misturadas e onde estão');
  }
  return faltas;
}

/**
 * Envios no formato antigo (uma geladeira em campos soltos da auditoria) ainda podem estar
 * na fila de algum celular: viram a geladeira 1.
 */
export function converterFormatoAntigo(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const d = raw as Record<string, unknown>;
  if (Array.isArray(d.geladeiras) || d.existeGeladeira !== true) return d;
  return {
    ...d,
    geladeiras: [
      {
        identificacao: null,
        marcaVisual: d.marcaVisualGeladeira ?? null,
        posse: d.posseGeladeira ?? null,
        monsterPresente: d.monsterPresente === false ? false : d.monsterNaGeladeira ?? null,
        mapaBebidas: d.mapaBebidas ?? [],
        organizacao: d.organizacaoGeladeira ?? null,
        abastecimento: d.abastecimentoGeladeira ?? null,
        visibilidade: d.visibilidadeMarcas ?? null,
        concorrentesMisturados: d.concorrentesMisturados ?? null,
        concorrentesDetalhes: d.concorrentesDetalhes ?? null
      }
    ]
  };
}

const AuditoriaSubmissionObject = z.object({
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

  // §4 a §7: uma entrada por geladeira da loja
  existeGeladeira: z.boolean().optional().nullable(),
  geladeiras: z.array(GeladeiraSchema).optional().default([]),

  // §5 Monster na loja (dentro ou fora das geladeiras)
  monsterPresente: z.boolean().optional().nullable(),

  // §6 Marcas Coca-Cola vistas na loja
  marcasCocaPresentes: z.array(z.string()).optional().default([]),

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
  const exigir = (condicao: boolean, path: (string | number)[], message: string) => {
    if (condicao) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
  };

  const isOperante = data.statusEntrada === STATUS_ENTRADA.ABERTA;
  const geladeiras = isOperante && data.existeGeladeira === true ? data.geladeiras : [];

  if (!isOperante) {
    const just = data.justificativaInoperante?.trim() || '';
    exigir(
      just.length < JUSTIFICATIVA_MIN,
      ['justificativaInoperante'],
      `Descreva a situação da loja (mínimo ${JUSTIFICATIVA_MIN} caracteres)`
    );
  } else {
    exigir(nulo(data.existeGeladeira), ['existeGeladeira'], 'Informe se existe geladeira de bebidas');

    if (data.existeGeladeira) {
      exigir(geladeiras.length === 0, ['geladeiras'], 'Registre ao menos uma geladeira');
      exigir(geladeiras.length > MAX_GELADEIRAS, ['geladeiras'], `No máximo ${MAX_GELADEIRAS} geladeiras por loja`);
      geladeiras.forEach((g, i) => {
        for (const falta of pendenciasGeladeira(g)) {
          exigir(true, ['geladeiras', i], `Geladeira ${i + 1}: ${falta}`);
        }
      });
    }

    exigir(nulo(data.monsterPresente), ['monsterPresente'], 'Informe se existe Monster na loja');
    exigir(
      data.monsterPresente === false && geladeiras.some((g) => g.monsterPresente === true),
      ['monsterPresente'],
      'Há Monster em uma geladeira: marque que existe Monster na loja'
    );

    exigir(nulo(data.espacoLivreCaixa), ['espacoLivreCaixa'], 'Informe se existe espaço livre próximo ao caixa');
    exigir(
      data.espacoLivreCaixa === true && nulo(data.boaVisibilidadeCaixa),
      ['boaVisibilidadeCaixa'],
      'Informe se o espaço tem boa visibilidade para o consumidor'
    );
    exigir(!data.espacoDisponivel, ['espacoDisponivel'], 'Classifique o espaço disponível (Bom / Limitado / Insuficiente)');
    exigir(nulo(data.outrosDisplaysImpulso), ['outrosDisplaysImpulso'], 'Informe se existe exposição de balas, gomas ou doces');
    exigir(
      data.outrosDisplaysImpulso === true && nulo(data.displaysImpulsoProximo),
      ['displaysImpulsoProximo'],
      'Informe se a exposição de impulso está próxima ao caixa'
    );
    exigir(!data.potencialDisplay, ['potencialDisplay'], 'Classifique o potencial para o Display Coca-Cola Vai Até Você');
  }

  // Fotos antigas sem o número da geladeira contam como geladeira 1
  const presentes = new Set(data.fotos.map((f) => chaveTipoFoto(f.tipo)));
  const obrigatorias = fotosObrigatorias({
    inoperante: !isOperante,
    existeGeladeira: data.existeGeladeira,
    geladeiras,
    espacoLivreCaixa: data.espacoLivreCaixa
  });
  for (const tipo of obrigatorias) {
    if (!presentes.has(tipo)) {
      const label = metaTipoFoto(tipo)?.label || tipo;
      const { geladeira } = lerTipoFoto(tipo);
      exigir(
        true,
        ['fotos'],
        geladeira ? `Geladeira ${geladeira}: foto obrigatória ausente – ${label}` : `Foto obrigatória ausente: ${label}`
      );
    }
  }
});

export const AuditoriaSubmissionSchema = z.preprocess(converterFormatoAntigo, AuditoriaSubmissionObject);

export type AuditoriaSubmissionInput = z.infer<typeof AuditoriaSubmissionSchema>;
