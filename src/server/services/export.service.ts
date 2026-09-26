import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { storageService } from '../storage/storage.service';
import {
  CATEGORIAS_BEBIDA,
  FOTOS_DA_GELADEIRA,
  TIPOS_FOTO,
  lerTipoFoto,
  nomeArquivoFoto
} from '../../shared/constants';
import { geladeirasDaAuditoria, lerJsonArray } from './geladeiras';

const simNao = (v: boolean | null | undefined): string =>
  v === null || v === undefined ? '' : v ? 'Sim' : 'Não';

const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/** CSV com ";" e BOM para o Excel em português abrir com acentos e colunas certas */
const montarCsv = (headers: string[], linhas: unknown[][]) =>
  '﻿' + [headers, ...linhas].map((l) => l.map(escapeCsv).join(';')).join('\r\n');

type FotoLink = { tipo: string; url: string; driveUrl: string | null };

const linkFoto = (f: FotoLink | undefined, baseUrl: string): string => {
  if (!f) return '';
  if (f.driveUrl) return f.driveUrl;
  return f.url.startsWith('http') ? f.url : `${baseUrl}${f.url}`;
};

/** Fotos da loja (não de geladeira): visão geral, caixa, display */
const FOTOS_DA_LOJA = TIPOS_FOTO.filter((t) => !FOTOS_DA_GELADEIRA.some((g) => g.id === t.id));

const lojasComAuditoria = () =>
  prisma.loja.findMany({
    include: {
      auditoria: {
        include: {
          pesquisador: true,
          geladeiras: true,
          // Sem o base64: o relatório só precisa dos links
          fotos: { select: { tipo: true, url: true, driveUrl: true } }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

export class ExportService {
  /**
   * Relatório por loja: uma linha por loja, com a quantidade de geladeiras.
   * O detalhe de cada geladeira fica no relatório de geladeiras.
   */
  async generateCsvReport(baseUrl = ''): Promise<string> {
    const lojas = await lojasComAuditoria();

    const headers = [
      'ID Loja',
      'Rede',
      'Nome da Loja',
      'Endereço',
      'Estação de Metrô',
      'CNPJ Formatado',
      'CNPJ Limpo',
      'Status Auditoria',
      'Data/Hora Auditoria',
      'Pesquisador',
      'Status de Entrada',
      'Justificativa / Situação',
      'Existe Geladeira?',
      'Qtd. de Geladeiras',
      'Monster na Loja?',
      'Monster em Alguma Geladeira?',
      'Marcas Coca-Cola Presentes',
      'Espaço Livre no Caixa?',
      'Lado e Tamanho do Espaço',
      'Produtos Expostos no Caixa',
      'Boa Visibilidade no Caixa?',
      'Espaço Disponível',
      'Exposição de Balas/Gomas/Doces?',
      'Marcas na Exposição de Impulso',
      'Exposição Próxima ao Caixa?',
      'Potencial Display Coca-Cola Vai Até Você',
      'Descrição da Oportunidade',
      ...FOTOS_DA_LOJA.map((t) => `Foto ${t.arquivo} (URL)`)
    ];

    const linhas = lojas.map((l) => {
      const a = l.auditoria;
      const geladeiras = a ? geladeirasDaAuditoria(a) : [];
      const marcasCoca = lerJsonArray<string>(a?.marcasCocaPresentes).join(', ');

      return [
        l.id,
        l.rede,
        l.nome,
        l.endereco,
        l.estacaoMetro || '',
        l.cnpjFormatado,
        l.cnpj,
        l.status,
        l.auditadaEm ? new Date(l.auditadaEm).toLocaleString('pt-BR') : '',
        a?.pesquisador?.nome || '',
        a?.statusEntrada || '',
        a?.justificativaInoperante || '',
        simNao(a?.existeGeladeira),
        a?.existeGeladeira ? geladeiras.length : a?.existeGeladeira === false ? 0 : '',
        simNao(a?.monsterPresente),
        geladeiras.length ? simNao(geladeiras.some((g) => g.monsterPresente)) : '',
        marcasCoca,
        simNao(a?.espacoLivreCaixa),
        a?.espacoLadoTamanho || '',
        a?.produtosExpostosCaixa || '',
        simNao(a?.boaVisibilidadeCaixa),
        a?.espacoDisponivel || '',
        simNao(a?.outrosDisplaysImpulso),
        a?.displaysImpulsoMarcas || '',
        simNao(a?.displaysImpulsoProximo),
        a?.potencialDisplay || '',
        a?.descricaoOportunidade || '',
        ...FOTOS_DA_LOJA.map((t) => linkFoto(a?.fotos.find((f) => f.tipo === t.id), baseUrl))
      ];
    });

    return montarCsv(headers, linhas);
  }

  /**
   * Relatório de geladeiras: uma linha por geladeira, com os dados da loja repetidos
   * para a planilha poder ser filtrada e ordenada sozinha.
   */
  async generateGeladeirasCsv(baseUrl = ''): Promise<string> {
    const lojas = await lojasComAuditoria();

    const headers = [
      'ID Loja',
      'Rede',
      'Nome da Loja',
      'Estação de Metrô',
      'CNPJ Formatado',
      'Data/Hora Auditoria',
      'Pesquisador',
      'Geladeira Nº',
      'Qtd. de Geladeiras na Loja',
      'Identificação da Geladeira',
      'Identificação Visual',
      'Aparenta Pertencer a',
      'Monster nesta Geladeira?',
      ...CATEGORIAS_BEBIDA.flatMap((c) => [`${c} - Tem?`, `${c} - Principais Marcas`, `${c} - Concorrentes?`]),
      'Organização',
      'Abastecimento',
      'Visibilidade das Marcas',
      'Concorrentes Misturados?',
      'Concorrentes - Marcas e Posição',
      ...FOTOS_DA_GELADEIRA.map((t) => `Foto ${t.arquivo} (URL)`)
    ];

    const linhas: unknown[][] = [];
    for (const l of lojas) {
      const a = l.auditoria;
      if (!a) continue;
      const geladeiras = geladeirasDaAuditoria(a);

      for (const g of geladeiras) {
        const fotoDaGeladeira = (base: string) =>
          a.fotos.find((f) => {
            const t = lerTipoFoto(f.tipo);
            return t.base === base && t.geladeira === g.ordem;
          });

        linhas.push([
          l.id,
          l.rede,
          l.nome,
          l.estacaoMetro || '',
          l.cnpjFormatado,
          l.auditadaEm ? new Date(l.auditadaEm).toLocaleString('pt-BR') : '',
          a.pesquisador?.nome || '',
          g.ordem,
          geladeiras.length,
          g.identificacao || '',
          g.marcaVisual || '',
          g.posse || '',
          simNao(g.monsterPresente),
          ...CATEGORIAS_BEBIDA.flatMap((c) => {
            const item = (g.mapaBebidas || []).find((m) => m.categoria === c);
            return [simNao(item?.tem), item?.marcas || '', item?.tem ? simNao(item.concorrentes) : ''];
          }),
          g.organizacao || '',
          g.abastecimento || '',
          g.visibilidade || '',
          simNao(g.concorrentesMisturados),
          g.concorrentesDetalhes || '',
          ...FOTOS_DA_GELADEIRA.map((t) => linkFoto(fotoDaGeladeira(t.id), baseUrl))
        ]);
      }
    }

    return montarCsv(headers, linhas);
  }

  /**
   * Compacta todas as fotos em streaming, uma pasta por loja,
   * com os nomes do guia (01 - Visao geral ... 06 - Espaco potencial display)
   */
  async streamPhotosZip(writableStream: NodeJS.WritableStream): Promise<void> {
    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    // Download cancelado pelo coordenador: para de ler fotos do banco
    let cancelado = false;
    writableStream.on('close', () => {
      cancelado = true;
      archive.abort();
    });

    archive.pipe(writableStream);

    // Uma foto por vez: espera o arquivo processar a anterior antes de carregar a próxima,
    // para não manter as ~400 fotos (base64) na memória do servidor ao mesmo tempo
    const aguardarEntrada = () =>
      new Promise<void>((resolve, reject) => {
        const concluir = (erro?: Error) => {
          archive.removeListener('entry', ok);
          archive.removeListener('error', concluir);
          writableStream.removeListener('close', ok);
          if (erro) reject(erro);
          else resolve();
        };
        const ok = () => concluir();
        archive.once('entry', ok);
        archive.once('error', concluir);
        writableStream.once('close', ok);
      });

    const auditorias = await prisma.auditoria.findMany({
      include: {
        loja: { select: { nome: true } },
        fotos: { select: { id: true, tipo: true, url: true } }
      }
    });

    const baseDir = storageService.getBaseDir();

    for (const aud of auditorias) {
      const nomePastaLoja = aud.loja.nome.replace(/[\\/:*?"<>|]/g, '-').trim();

      for (const foto of aud.fotos) {
        if (cancelado) return;

        const relative = foto.url.replace(/^\/?uploads\//, '');
        const fullDiskPath = path.join(baseDir, relative);
        const zipEntryName = `${nomePastaLoja}/${nomeArquivoFoto(foto.tipo)}.webp`;
        const processada = aguardarEntrada();

        if (fs.existsSync(fullDiskPath)) {
          archive.file(fullDiskPath, { name: zipEntryName });
        } else {
          const { base64 } = (await prisma.foto.findUnique({ where: { id: foto.id }, select: { base64: true } })) || {};
          if (base64) {
            const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
            archive.append(Buffer.from(base64Data, 'base64'), { name: zipEntryName });
          } else {
            archive.append(`Foto: ${foto.tipo}\nURL: ${foto.url}\nLoja: ${aud.loja.nome}`, {
              name: zipEntryName.replace(/\.webp$/, '.txt')
            });
          }
        }

        await processada;
      }
    }

    if (!cancelado) await archive.finalize();
  }
}

export const exportService = new ExportService();
