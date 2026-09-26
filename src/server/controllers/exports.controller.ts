import { Request, Response } from 'express';
import { exportService } from '../services/export.service';

export async function exportarCsv(req: Request, res: Response) {
  try {
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const csvContent = await exportService.generateCsvReport(baseUrl);

    const filename = `relatorio_auditorias_pdv_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório CSV' });
  }
}

export async function exportarCsvGeladeiras(req: Request, res: Response) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const csvContent = await exportService.generateGeladeirasCsv(baseUrl);
    const filename = `relatorio_geladeiras_pdv_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Erro ao exportar CSV de geladeiras:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de geladeiras' });
  }
}

export async function exportarZip(req: Request, res: Response) {
  try {
    const filename = `fotos_auditorias_pdv_${new Date().toISOString().slice(0, 10)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await exportService.streamPhotosZip(res);
  } catch (error) {
    console.error('Erro ao exportar ZIP de fotos:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro ao compactar fotos em ZIP' });
    }
    // ZIP já começou a ser enviado: corta a conexão para o navegador acusar download incompleto
    res.destroy();
  }
}
