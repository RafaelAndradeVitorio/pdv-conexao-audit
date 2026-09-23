import { Request, Response } from 'express';
import { googleDriveService } from '../services/googleDrive.service';

export async function obterStatusDrive(_req: Request, res: Response) {
  try {
    const stats = await googleDriveService.getSyncStats();
    return res.json(stats);
  } catch (error: unknown) {
    console.error('Erro ao obter status do Drive:', error);
    return res.status(500).json({ error: 'Erro ao consultar status da sincronização com o Google Drive' });
  }
}

export async function sincronizarFotosDrive(_req: Request, res: Response) {
  try {
    const result = await googleDriveService.syncAllPendingPhotos();
    return res.json({
      message: `${result.totalEnqueued} fotos enfileiradas para sincronização com o Google Drive`,
      enqueued: result.totalEnqueued
    });
  } catch (error: unknown) {
    console.error('Erro ao sincronizar fotos com Drive:', error);
    return res.status(500).json({ error: 'Erro ao disparar sincronização com o Google Drive' });
  }
}
