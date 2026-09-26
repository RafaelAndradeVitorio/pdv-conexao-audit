import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import { prisma } from '../db';
import { storageService } from '../storage/storage.service';
import { nomeArquivoFoto } from '../../shared/constants';

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

const DEFAULT_FOLDER_ID = '11ax5g10dzEhEql3fGS3i-uxwz6vduKvj';

export interface SyncQueueItem {
  fotoId: string;
  lojaNome: string;
  localPath: string;
  fileName: string;
  retries: number;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive | null = null;
  private parentFolderId: string | null = null;
  private webhookUrl: string | null = null;
  private folderCache: Map<string, string> = new Map();
  private queue: SyncQueueItem[] = [];
  private isProcessingQueue = false;
  // Foto sendo enviada agora (já saiu da fila)
  private fotoEmEnvio: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o cliente do Google Drive ou o Webhook do Google Apps Script
   */
  public initialize(): boolean {
    // A URL do Apps Script funciona como credencial: vem só do ambiente, nunca do código
    // Testes automatizados não podem mandar fotos de teste para o Drive real
    if (process.env.VITEST) {
      console.log('[GoogleDrive] Desativado durante os testes.');
      return false;
    }

    this.webhookUrl = process.env.GOOGLE_DRIVE_WEBHOOK_URL?.trim() || null;
    this.parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;

    if (this.webhookUrl) {
      this.isInitialized = true;
      console.log('[GoogleDrive] Webhook Google Apps Script configurado com sucesso (Cota pessoal de 15GB ativa).');
      return true;
    }

    try {
      const credentialsPath = path.resolve(
        process.env.GOOGLE_CREDENTIALS_FILE || './google-credentials.json'
      );

      if (!fs.existsSync(credentialsPath)) {
        console.warn(`[GoogleDrive] Arquivo de credenciais não encontrado em: ${credentialsPath}. Modo offline ativado.`);
        return false;
      }

      if (!this.parentFolderId) {
        console.warn('[GoogleDrive] GOOGLE_DRIVE_FOLDER_ID não configurado no .env. Modo offline ativado.');
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.isInitialized = true;
      console.log(`[GoogleDrive] API v3 conectada com sucesso. Pasta raiz: ${this.parentFolderId}`);
      return true;
    } catch (error) {
      console.error('[GoogleDrive] Falha ao inicializar Google Drive API:', error);
      this.isInitialized = false;
      return false;
    }
  }

  public isAvailable(): boolean {
    return !!this.webhookUrl || (this.isInitialized && this.drive !== null && this.parentFolderId !== null);
  }

  /**
   * Upload via Google Apps Script Webhook (executa no contexto do Gmail pessoal do usuário com cota de 15GB)
   */
  private async uploadViaWebhook(
    storeName: string,
    localFilePath: string,
    fileName: string,
    mimeType = 'image/webp',
    fallbackBase64?: string
  ): Promise<DriveUploadResult> {
    let base64 = '';
    if (fs.existsSync(localFilePath)) {
      const fileBuffer = fs.readFileSync(localFilePath);
      base64 = fileBuffer.toString('base64');
    } else if (fallbackBase64) {
      base64 = fallbackBase64.replace(/^data:image\/\w+;base64,/, '');
    } else {
      throw new Error(`Arquivo não encontrado para upload no Drive: ${localFilePath}`);
    }

    const payload = {
      storeName,
      fileName,
      mimeType,
      base64
    };

    const res = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Resposta do webhook Google Apps Script: ${responseText.slice(0, 200)}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro retornado pelo Google Apps Script');
    }

    return {
      fileId: data.fileId,
      webViewLink: data.webViewLink
    };
  }

  /**
   * Garante que a subpasta com o nome da loja existe dentro da pasta principal do Drive (via API v3).
   */
  public async ensureStoreFolder(storeName: string): Promise<string> {
    if (this.webhookUrl) {
      // O webhook gerencia a criação de pastas da loja diretamente no Apps Script
      return 'webhook-managed';
    }

    if (!this.isAvailable() || !this.drive || !this.parentFolderId) {
      throw new Error('Google Drive service não está configurado.');
    }

    const cleanName = storeName.replace(/[\\/:*?"<>|]/g, '-').trim();

    // 1. Checa cache em memória
    if (this.folderCache.has(cleanName)) {
      return this.folderCache.get(cleanName)!;
    }

    // 2. Procura pasta existente no Drive dentro da pasta raiz
    try {
      const sanitizedQueryName = cleanName.replace(/'/g, "\\'");
      const q = `'${this.parentFolderId}' in parents and name = '${sanitizedQueryName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

      const response = await this.drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const existingFolder = response.data.files?.[0];
      if (existingFolder && existingFolder.id) {
        this.folderCache.set(cleanName, existingFolder.id);
        return existingFolder.id;
      }

      // 3. Cria nova subpasta caso não exista
      const createdFolder = await this.drive.files.create({
        requestBody: {
          name: cleanName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.parentFolderId]
        },
        fields: 'id, name',
        supportsAllDrives: true
      });

      const newFolderId = createdFolder.data.id;
      if (!newFolderId) {
        throw new Error(`Falha ao criar pasta para loja: ${cleanName}`);
      }

      this.folderCache.set(cleanName, newFolderId);
      console.log(`[GoogleDrive] Criada nova pasta para loja: "${cleanName}" (ID: ${newFolderId})`);
      return newFolderId;
    } catch (error) {
      console.error(`[GoogleDrive] Erro ao obter/criar pasta da loja "${cleanName}":`, error);
      throw error;
    }
  }

  /**
   * Faz o upload de um arquivo para o Google Drive na pasta da respectiva loja.
   */
  public async uploadPhoto(
    storeName: string,
    localFilePath: string,
    fileName: string,
    mimeType = 'image/webp',
    fallbackBase64?: string
  ): Promise<DriveUploadResult> {
    if (!this.isAvailable()) {
      throw new Error('Google Drive service não está configurado.');
    }

    if (!fs.existsSync(localFilePath)) {
      if (fallbackBase64) {
        try {
          const raw = fallbackBase64.replace(/^data:image\/\w+;base64,/, '');
          fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
          fs.writeFileSync(localFilePath, Buffer.from(raw, 'base64'));
        } catch {
          // segue para upload direto via webhook
        }
      } else {
        throw new Error(`Arquivo local não encontrado: ${localFilePath}`);
      }
    }

    // 1. Se webhook estiver configurado, usa execução direta no Gmail pessoal
    if (this.webhookUrl) {
      const result = await this.uploadViaWebhook(storeName, localFilePath, fileName, mimeType, fallbackBase64);
      console.log(`[GoogleDrive Webhook] Foto "${fileName}" enviada com sucesso para "${storeName}". Link: ${result.webViewLink}`);
      return result;
    }

    // 2. Fallback para Google Drive API v3 (Workspace / Shared Drives)
    if (!this.drive) {
      throw new Error('Cliente Google Drive não inicializado');
    }

    const folderId = await this.ensureStoreFolder(storeName);

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType,
      body: fs.createReadStream(localFilePath)
    };

    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true
    });

    const fileId = file.data.id!;
    let webViewLink = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      });
    } catch {
      // Ignora erro se herdado
    }

    console.log(`[GoogleDrive API] Foto "${fileName}" enviada com sucesso para "${storeName}". Link: ${webViewLink}`);

    return {
      fileId,
      webViewLink
    };
  }

  /**
   * Adiciona uma foto à fila de sincronização em segundo plano (não bloqueia o pesquisador)
   */
  public enqueuePhotoUpload(
    fotoId: string,
    lojaNome: string,
    localFilePath: string,
    fileName: string
  ): void {
    // Botão "sincronizar" apertado várias vezes não pode duplicar a foto no Drive
    if (this.fotoEmEnvio === fotoId || this.queue.some((item) => item.fotoId === fotoId)) return;

    this.queue.push({
      fotoId,
      lojaNome,
      localPath: localFilePath,
      fileName,
      retries: 0
    });

    // Inicia processamento assíncrono se não estiver em execução
    this.processQueue().catch((err) => {
      console.error('[GoogleDrive Queue] Erro no loop de processamento:', err);
    });
  }

  /**
   * Enfileira todas as fotos de uma auditoria recém-salva
   */
  public async enqueueAuditPhotos(auditoriaId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const auditoria = await prisma.auditoria.findUnique({
        where: { id: auditoriaId },
        include: {
          loja: true,
          // O base64 é lido do banco só na hora do envio de cada foto
          fotos: { select: { id: true, tipo: true, url: true, driveFileId: true } }
        }
      });

      if (!auditoria || !auditoria.fotos.length) return;

      const baseDir = storageService.getBaseDir();

      for (const foto of auditoria.fotos) {
        if (foto.driveFileId) continue; // Já sincronizada

        const relative = foto.url.replace(/^\/?uploads\//, '');
        const fullDiskPath = path.join(baseDir, relative);
        const prefix = nomeArquivoFoto(foto.tipo);
        const fileName = `${prefix}.webp`;

        this.enqueuePhotoUpload(foto.id, auditoria.loja.nome, fullDiskPath, fileName);
      }
    } catch (error) {
      console.error(`[GoogleDrive] Erro ao enfileirar fotos da auditoria ${auditoriaId}:`, error);
    }
  }

  /**
   * Processador da fila de segundo plano com controle de concorrência e retries
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0 || !this.isAvailable()) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;
        this.fotoEmEnvio = item.fotoId;

        try {
          const foto = await prisma.foto.findUnique({
            where: { id: item.fotoId },
            select: { driveFileId: true, base64: true }
          });
          // Apagada (loja resetada) ou já enviada por outra rodada de sincronização
          if (!foto || foto.driveFileId) continue;

          const result = await this.uploadPhoto(
            item.lojaNome,
            item.localPath,
            item.fileName,
            'image/webp',
            foto.base64 || undefined
          );

          // Atualiza o banco de dados com os links do Drive
          await prisma.foto.update({
            where: { id: item.fotoId },
            data: {
              driveFileId: result.fileId,
              driveUrl: result.webViewLink
            }
          });
        } catch (error) {
          console.error(`[GoogleDrive Queue] Falha ao enviar foto ${item.fileName} da loja ${item.lojaNome}:`, error);

          if (item.retries < 3) {
            item.retries += 1;
            console.log(`[GoogleDrive Queue] Reenfileirando foto ${item.fileName} (Tentativa ${item.retries}/3)...`);
            // Espera 2 segundos antes de tentar novamente (backoff simples)
            await new Promise((resolve) => setTimeout(resolve, 2000));
            this.queue.push(item);
          } else {
            console.error(`[GoogleDrive Queue] Foto ${item.fileName} descartada da fila após 3 tentativas com falha.`);
          }
        }
      }
    } finally {
      this.fotoEmEnvio = null;
      this.isProcessingQueue = false;
    }
  }

  /**
   * Sincroniza todas as fotos no banco que ainda não têm driveFileId
   */
  public async syncAllPendingPhotos(): Promise<{ totalEnqueued: number }> {
    if (!this.isAvailable()) {
      return { totalEnqueued: 0 };
    }

    const fotosPendentes = await prisma.foto.findMany({
      where: { driveFileId: null },
      select: {
        id: true,
        tipo: true,
        url: true,
        auditoria: { select: { loja: { select: { nome: true } } } }
      }
    });

    const baseDir = storageService.getBaseDir();
    let count = 0;

    for (const foto of fotosPendentes) {
      const relative = foto.url.replace(/^\/?uploads\//, '');
      const fullDiskPath = path.join(baseDir, relative);
      const prefix = nomeArquivoFoto(foto.tipo);
      const fileName = `${prefix}.webp`;

      this.enqueuePhotoUpload(foto.id, foto.auditoria.loja.nome, fullDiskPath, fileName);
      count++;
    }

    console.log(`[GoogleDrive] ${count} fotos pendentes enfileiradas para sincronização.`);
    return { totalEnqueued: count };
  }

  /**
   * Retorna estatísticas de sincronização com o Drive
   */
  public async getSyncStats(): Promise<{
    isConfigured: boolean;
    mode: 'webhook' | 'service_account' | 'offline';
    queueLength: number;
    totalSynced: number;
    totalPending: number;
    parentFolderId: string | null;
  }> {
    const totalSynced = await prisma.foto.count({
      where: { driveFileId: { not: null } }
    });
    const totalPending = await prisma.foto.count({
      where: { driveFileId: null }
    });

    const mode = this.webhookUrl
      ? 'webhook'
      : this.drive
      ? 'service_account'
      : 'offline';

    return {
      isConfigured: this.isAvailable(),
      mode,
      queueLength: this.queue.length,
      totalSynced,
      totalPending,
      parentFolderId: this.parentFolderId
    };
  }
}

export const googleDriveService = new GoogleDriveService();

// Dispara sincronização em segundo plano para qualquer foto pendente no banco ao inicializar o servidor
setTimeout(() => {
  googleDriveService.syncAllPendingPhotos().catch((e) => {
    console.error('[GoogleDrive] Erro na sincronização inicial:', e);
  });
}, 3000);
