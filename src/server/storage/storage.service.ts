import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export interface UploadResult {
  url: string;
  storagePath: string;
  size: number;
}

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.env.STORAGE_DIR || './uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Salva foto com estrutura padronizada: {cnpj}/foto_{tipo}_{timestamp}.webp
   */
  async savePhoto(
    cnpj: string,
    tipo: string,
    buffer: Buffer,
    extension = 'webp'
  ): Promise<UploadResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const folderPath = path.join(this.baseDir, cleanCnpj);
    await mkdir(folderPath, { recursive: true });

    const timestamp = Date.now();
    const fileName = `foto_${tipo}_${timestamp}.${extension}`;
    const filePath = path.join(folderPath, fileName);

    await writeFile(filePath, buffer);

    const relativePath = `${cleanCnpj}/${fileName}`;
    const url = `/uploads/${relativePath}`;

    return {
      url,
      storagePath: filePath,
      size: buffer.length
    };
  }

  getFilePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  fileExists(relativePath: string): boolean {
    return fs.existsSync(this.getFilePath(relativePath));
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

export const storageService = new StorageService();
