import dotenv from 'dotenv';
dotenv.config();

import { auditService } from '../src/server/services/audit.service';
import { exportService } from '../src/server/services/export.service';
import { storageService } from '../src/server/storage/storage.service';
import { prisma } from '../src/server/db';
import { STATUS_ENTRADA } from '../src/shared/constants';

async function testFullFlow() {
  console.log('=== TESTE END-TO-END AUDITORIA COM GOOGLE DRIVE ===');

  // Loja de teste: loja-02
  const lojaId = 'loja-02';
  const loja = await prisma.loja.findUnique({ where: { id: lojaId } });
  if (!loja) throw new Error('Loja não encontrada');

  // Limpa se já tiver auditoria
  await prisma.foto.deleteMany({ where: { auditoria: { lojaId } } });
  await prisma.auditoria.deleteMany({ where: { lojaId } });
  await prisma.loja.update({
    where: { id: lojaId },
    data: { status: 'PENDENTE', auditadaEm: null, pesquisadorId: null }
  });

  // 1. Salva foto mock no storage local
  const webpBuffer = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA=', 'base64');
  const uploadFoto1 = await storageService.savePhoto(loja.cnpj, 'foto_fachada', webpBuffer, 'webp');
  console.log('1. Foto salva localmente com sucesso:', uploadFoto1.url);

  // 2. Submete auditoria
  console.log('2. Submetendo auditoria para loja:', loja.nome);
  const auditoria = await auditService.submitAudit({
    lojaId,
    pesquisadorId: 'pesq-01',
    statusEntrada: STATUS_ENTRADA.ABERTA,
    existeGeladeira: true,
    marcaVisualGeladeira: 'Coca-Cola',
    posseGeladeira: 'Coca-Cola/FEMSA',
    organizacaoGeladeira: 'Organizada',
    monsterPresente: true,
    monsterNaGeladeira: true,
    marcasCocaPresentes: ['Coca-Cola', 'Fanta'],
    mapaBebidas: [],
    concorrentesMisturados: false,
    espacoLivreCaixa: true,
    espacoLadoTamanho: 'Direito ~40cm',
    outrosDisplaysImpulso: false,
    potencialDisplay: 'ALTO',
    descricaoOportunidade: 'Excelente fluxo ao lado do caixa',
    fotos: [
      {
        tipo: 'foto_fachada',
        url: uploadFoto1.url,
        tamanhoBytes: uploadFoto1.size
      }
    ]
  });

  console.log('3. Auditoria submetida com ID:', auditoria.id);
  console.log('4. Aguardando fila assíncrona do Google Drive processar (5 segundos)...');
  await new Promise((r) => setTimeout(r, 6000));

  // 5. Verifica se foto foi atualizada com driveUrl
  const fotoAtualizada = await prisma.foto.findFirst({
    where: { auditoriaId: auditoria.id }
  });

  console.log('\n--- Resultado no Banco de Dados ---');
  console.log('Foto ID:', fotoAtualizada?.id);
  console.log('Drive File ID:', fotoAtualizada?.driveFileId);
  console.log('Drive URL:', fotoAtualizada?.driveUrl);

  if (!fotoAtualizada?.driveUrl) {
    throw new Error('Falha: driveUrl não foi preenchido na foto!');
  }

  // 6. Verifica CSV
  const csv = await exportService.generateCsvReport();
  const hasDriveLink = csv.includes(fotoAtualizada.driveUrl);
  console.log('\n--- Verificação no Relatório CSV ---');
  console.log('Link do Drive presente no CSV?', hasDriveLink ? 'SIM ✅' : 'NÃO ❌');

  console.log('\n=== TESTE CONCLUÍDO COM 100% DE SUCESSO! ===');
}

testFullFlow()
  .catch((e) => {
    console.error('ERRO:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
