import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Foto } from '@prisma/client';
import { prisma } from '../db';
import { storageService } from '../storage/storage.service';

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
      'Justificativa Inoperante',
      'Existe Geladeira?',
      'Marca Visual Geladeira',
      'Posse Geladeira',
      'Organização/Abastecimento',
      'Monster Presente?',
      'Monster na Geladeira?',
      'Marcas Coca-Cola Presentes',
      'Concorrentes Misturados?',
      'Detalhes Concorrentes',
      'Espaço Livre no Caixa?',
      'Lado e Tamanho do Espaço',
      'Outros Displays Impulso?',
      'Potencial Display Coca-Cola Vai Até Você',
      'Descrição da Oportunidade',
      'Foto 01 - Fachada da Loja (URL)',
      'Foto 02 - Geladeira Fechada (URL)',
      'Foto 03 - Geladeira Aberta - Marcas (URL)',
      'Foto 04 - Concorrentes - Detalhes (URL)',
      'Foto 05 - Área do Caixa (URL)',
      'Foto 06 - Espaço do Display - Oportunidade (URL)'
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

      let marcasCoca = '';
      if (a?.marcasCocaPresentes) {
        try {
          const parsed = JSON.parse(a.marcasCocaPresentes);
          if (Array.isArray(parsed)) marcasCoca = parsed.join(', ');
        } catch {
          marcasCoca = a.marcasCocaPresentes;
        }
      }

      const getFotoUrl = (tipo: string): string => {
        if (!a || !a.fotos) return '';
        const f = a.fotos.find((foto: Foto) => foto.tipo === tipo);
        if (!f) return '';
        if ((f as any).driveUrl) {
          return (f as any).driveUrl;
        }
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
        a?.existeGeladeira !== null && a?.existeGeladeira !== undefined ? (a.existeGeladeira ? 'Sim' : 'Não') : '',
        a?.marcaVisualGeladeira || '',
        a?.posseGeladeira || '',
        a?.organizacaoGeladeira || '',
        a?.monsterPresente !== null && a?.monsterPresente !== undefined ? (a.monsterPresente ? 'Sim' : 'Não') : '',
        a?.monsterNaGeladeira !== null && a?.monsterNaGeladeira !== undefined ? (a.monsterNaGeladeira ? 'Sim' : 'Não') : '',
        marcasCoca,
        a?.concorrentesMisturados !== null && a?.concorrentesMisturados !== undefined ? (a.concorrentesMisturados ? 'Sim' : 'Não') : '',
        a?.concorrentesDetalhes || '',
        a?.espacoLivreCaixa !== null && a?.espacoLivreCaixa !== undefined ? (a.espacoLivreCaixa ? 'Sim' : 'Não') : '',
        a?.espacoLadoTamanho || '',
        a?.outrosDisplaysImpulso !== null && a?.outrosDisplaysImpulso !== undefined ? (a.outrosDisplaysImpulso ? 'Sim' : 'Não') : '',
        a?.potencialDisplay || '',
        a?.descricaoOportunidade || '',
        getFotoUrl('foto_fachada'),
        getFotoUrl('foto_geladeira'),
        getFotoUrl('foto_marcas'),
        getFotoUrl('foto_concorrentes'),
        getFotoUrl('foto_caixa'),
        getFotoUrl('foto_display')
      ];

      rows.push(row.map(escapeCsv).join(';'));
    }

    return '\uFEFF' + rows.join('\r\n');
  }

  /**
   * Compacta todas as fotos em streaming organizadas por CNPJ da Loja
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
      // Nomeia as pastas no ZIP com o nome da loja
      const nomePastaLoja = aud.loja.nome.replace(/[\\/:*?"<>|]/g, '-').trim();

      for (const foto of aud.fotos) {
        const relative = foto.url.replace(/^\/?uploads\//, '');
        const fullDiskPath = path.join(baseDir, relative);

        if (fs.existsSync(fullDiskPath)) {
          const zipEntryName = `${nomePastaLoja}/${path.basename(fullDiskPath)}`;
          archive.file(fullDiskPath, { name: zipEntryName });
        } else if ((foto as any).base64) {
          const base64Data = (foto as any).base64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const zipEntryName = `${nomePastaLoja}/${path.basename(fullDiskPath)}`;
          archive.append(buffer, { name: zipEntryName });
        } else {
          const zipEntryName = `${nomePastaLoja}/${foto.tipo}.txt`;
          archive.append(`Foto: ${foto.tipo}\nURL: ${foto.url}\nLoja: ${aud.loja.nome}`, {
            name: zipEntryName
          });
        }
      }
    }

    await archive.finalize();
  }
}

export const exportService = new ExportService();
