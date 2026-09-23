import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Foto } from '@prisma/client';
import { prisma } from '../db';
import { storageService } from '../storage/storage.service';
import { CATEGORIAS_BEBIDA, NOME_ARQUIVO_FOTO, TIPOS_FOTO } from '../../shared/constants';
import type { MapaBebidaItem } from '../../shared/schemas';

const simNao = (v: boolean | null | undefined): string =>
  v === null || v === undefined ? '' : v ? 'Sim' : 'Não';

const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export class ExportService {
  /**
   * Gera relatório CSV completo com todas as 57 lojas e colunas detalhadas
   */
  async generateCsvReport(baseUrl = ''): Promise<string> {
    const lojas = await prisma.loja.findMany({
      include: {
        auditoria: {
          include: {
            pesquisador: true,
            fotos: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

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
      'Identificação Visual Geladeira',
      'Geladeira Aparenta Pertencer a',
      'Monster na Loja?',
      'Monster na Geladeira?',
      ...CATEGORIAS_BEBIDA.flatMap((c) => [`${c} - Tem?`, `${c} - Principais Marcas`, `${c} - Concorrentes?`]),
      'Marcas Coca-Cola Presentes',
      'Organização',
      'Abastecimento',
      'Visibilidade das Marcas',
      'Concorrentes Misturados?',
      'Concorrentes - Marcas e Posição',
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
      ...TIPOS_FOTO.map((t) => `Foto ${t.arquivo} (URL)`)
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [headers.map(escapeCsv).join(';')];

    for (const l of lojas) {
      const a = l.auditoria;
      const pesq = a?.pesquisador?.nome || '';
      const auditadaEm = l.auditadaEm ? new Date(l.auditadaEm).toLocaleString('pt-BR') : '';

      const marcasRaw = parseJson<unknown>(a?.marcasCocaPresentes, a?.marcasCocaPresentes || '');
      const marcasCoca = Array.isArray(marcasRaw) ? marcasRaw.join(', ') : String(marcasRaw || '');
      const mapa = parseJson<MapaBebidaItem[]>(a?.mapaBebidas, []);

      const getFotoUrl = (tipo: string): string => {
        const f = a?.fotos.find((foto: Foto) => foto.tipo === tipo);
        if (!f) return '';
        if (f.driveUrl) return f.driveUrl;
        return f.url.startsWith('http') ? f.url : `${baseUrl}${f.url}`;
      };

      const row = [
        l.id,
        l.rede,
        l.nome,
        l.endereco,
        l.estacaoMetro || '',
        l.cnpjFormatado,
        l.cnpj,
        l.status,
        auditadaEm,
        pesq,
        a?.statusEntrada || '',
        a?.justificativaInoperante || '',
        simNao(a?.existeGeladeira),
        a?.marcaVisualGeladeira || '',
        a?.posseGeladeira || '',
        simNao(a?.monsterPresente),
        simNao(a?.monsterNaGeladeira),
        ...CATEGORIAS_BEBIDA.flatMap((c) => {
          const item = mapa.find((m) => m.categoria === c);
          return [simNao(item?.tem), item?.marcas || '', item?.tem ? simNao(item.concorrentes) : ''];
        }),
        marcasCoca,
        a?.organizacaoGeladeira || '',
        a?.abastecimentoGeladeira || '',
        a?.visibilidadeMarcas || '',
        simNao(a?.concorrentesMisturados),
        a?.concorrentesDetalhes || '',
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
        ...TIPOS_FOTO.map((t) => getFotoUrl(t.id))
      ];

      rows.push(row.map(escapeCsv).join(';'));
    }

    return '﻿' + rows.join('\r\n');
  }

  /**
   * Compacta todas as fotos em streaming, uma pasta por loja,
   * com os nomes do guia (01 - Visao geral ... 06 - Espaco potencial display)
   */
  async streamPhotosZip(writableStream: NodeJS.WritableStream): Promise<void> {
    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    archive.pipe(writableStream);

    const auditorias = await prisma.auditoria.findMany({
      include: {
        loja: true,
        fotos: true
      }
    });

    const baseDir = storageService.getBaseDir();

    for (const aud of auditorias) {
      const nomePastaLoja = aud.loja.nome.replace(/[\\/:*?"<>|]/g, '-').trim();

      for (const foto of aud.fotos) {
        const relative = foto.url.replace(/^\/?uploads\//, '');
        const fullDiskPath = path.join(baseDir, relative);
        const zipEntryName = `${nomePastaLoja}/${NOME_ARQUIVO_FOTO[foto.tipo] || foto.tipo}.webp`;

        if (fs.existsSync(fullDiskPath)) {
          archive.file(fullDiskPath, { name: zipEntryName });
        } else if (foto.base64) {
          const base64Data = foto.base64.replace(/^data:image\/\w+;base64,/, '');
          archive.append(Buffer.from(base64Data, 'base64'), { name: zipEntryName });
        } else {
          archive.append(`Foto: ${foto.tipo}\nURL: ${foto.url}\nLoja: ${aud.loja.nome}`, {
            name: zipEntryName.replace(/\.webp$/, '.txt')
          });
        }
      }
    }

    await archive.finalize();
  }
}

export const exportService = new ExportService();
