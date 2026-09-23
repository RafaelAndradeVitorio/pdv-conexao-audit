import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { googleDriveService } from '../src/server/services/googleDrive.service';

async function main() {
  console.log('--- Iniciando Teste de Conexão com Google Drive ---');
  console.log('Pasta Raiz configurada:', process.env.GOOGLE_DRIVE_FOLDER_ID);
  console.log('Arquivo de credenciais:', process.env.GOOGLE_CREDENTIALS_FILE);

  if (!googleDriveService.isAvailable()) {
    console.error('ERRO: GoogleDriveService não está disponível. Verifique credenciais e pasta.');
    process.exit(1);
  }

  // Cria um arquivo temporário de teste
  const tempDir = path.resolve('./uploads/temp-test');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1x1 transparent WebP base64
  const webpBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA=';
  const testFilePath = path.join(tempDir, 'teste_conexao.webp');
  fs.writeFileSync(testFilePath, Buffer.from(webpBase64, 'base64'));

  const storeName = 'Monster Dog - Estação Sé';
  console.log(`\n1. Testando busca/criação da pasta da loja: "${storeName}"...`);
  const folderId = await googleDriveService.ensureStoreFolder(storeName);
  console.log(`SUCESSO: Pasta da loja obtida/criada! Folder ID: ${folderId}`);

  console.log(`\n2. Testando upload de foto WebP para a pasta da loja...`);
  const result = await googleDriveService.uploadPhoto(
    storeName,
    testFilePath,
    `teste_verificacao_${Date.now()}.webp`,
    'image/webp'
  );

  console.log(`SUCESSO: Foto enviada ao Google Drive!`);
  console.log(`File ID: ${result.fileId}`);
  console.log(`Visualização Web: ${result.webViewLink}`);

  // Limpa arquivo local temporário
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  console.log('\n--- Teste de Integração com Google Drive Concluído com Êxito! ---');
}

main().catch((err) => {
  console.error('\nFALHA NO TESTE DO GOOGLE DRIVE:', err);
  process.exit(1);
});
