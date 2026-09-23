import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetLoja(input: string) {
  const formattedId = input.startsWith('loja-') 
    ? input 
    : !isNaN(Number(input)) 
      ? `loja-${Number(input).toString().padStart(2, '0')}` 
      : input;

  console.log(`Resetando auditoria da loja: ${formattedId} (input: "${input}")...`);

  const loja = await prisma.loja.findFirst({
    where: {
      OR: [
        { id: formattedId },
        { id: input },
        { cnpj: input.replace(/\D/g, '') },
        { cnpjFormatado: input }
      ]
    },
    include: { auditoria: true }
  });

  if (!loja) {
    console.error(`Loja "${input}" não encontrada.`);
    return;
  }

  if (loja.auditoria) {
    await prisma.foto.deleteMany({
      where: { auditoriaId: loja.auditoria.id }
    });
    await prisma.auditoria.delete({
      where: { id: loja.auditoria.id }
    });
    console.log(`✓ Auditoria e fotos anteriores removidas.`);
  }

  const lojaAtualizada = await prisma.loja.update({
    where: { id: loja.id },
    data: {
      status: 'PENDENTE',
      auditadaEm: null,
      pesquisadorId: null
    }
  });

  console.log(`=======================================================`);
  console.log(`✓ Loja liberada para teste de auditoria:`);
  console.log(`   ID: ${lojaAtualizada.id}`);
  console.log(`   Nome: ${lojaAtualizada.nome}`);
  console.log(`   Rede: ${lojaAtualizada.rede}`);
  console.log(`   CNPJ: ${lojaAtualizada.cnpjFormatado}`);
  console.log(`   Status atual: ${lojaAtualizada.status}`);
  console.log(`=======================================================`);
}

const targetLojaId = process.argv[2] || 'loja-01';

resetLoja(targetLojaId)
  .catch((e) => {
    console.error('Erro ao resetar loja:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
