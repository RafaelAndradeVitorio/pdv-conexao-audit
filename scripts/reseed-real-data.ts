import { PrismaClient } from '@prisma/client';
import { REAL_RESEARCHERS, REAL_STORES } from '../src/server/db/realData';

const prisma = new PrismaClient();

export async function recadastrarDadosReais(): Promise<void> {
  console.log('== Zerando banco de dados para cadastro dos dados reais ==');

  // 1. Limpa todas as tabelas na ordem de chave estrangeira
  await prisma.foto.deleteMany({});
  await prisma.auditoria.deleteMany({});
  await prisma.pesquisadorLoja.deleteMany({});
  await prisma.loja.deleteMany({});
  await prisma.pesquisador.deleteMany({});

  console.log('✓ Banco de dados limpo com sucesso.');

  // 2. Cadastra todas as 59 lojas
  const numParaLojaId = new Map<number, string>();

  for (const s of REAL_STORES) {
    const id = `loja-${s.num.toString().padStart(2, '0')}`;
    numParaLojaId.set(s.num, id);

    await prisma.loja.create({
      data: {
        id,
        rede: s.rede,
        nome: s.nome,
        cnpj: s.cnpjRaw,
        cnpjFormatado: s.cnpjFormatado,
        endereco: s.endereco,
        estacaoMetro: s.estacaoMetro,
        status: 'PENDENTE'
      }
    });
  }
  console.log(`✓ ${REAL_STORES.length} lojas reais cadastradas.`);

  // 3. Cadastra os 9 pesquisadores com restrição explícita das suas lojas
  for (const r of REAL_RESEARCHERS) {
    const lojaIds = r.lojasNums.map((n) => numParaLojaId.get(n)!);

    await prisma.pesquisador.create({
      data: {
        id: r.id,
        nome: r.nome,
        telefone: r.telefone,
        ativo: true,
        todasLojas: false, // Define visualização restrita para visualizar apenas suas lojas
        lojasPermitidas: {
          create: lojaIds.map((lojaId) => ({ lojaId }))
        }
      }
    });
  }
  console.log(`✓ ${REAL_RESEARCHERS.length} pesquisadores reais cadastrados com vinculação restrita de lojas.`);
}

recadastrarDadosReais()
  .then(() => console.log('== Importação dos dados reais concluída com sucesso! =='))
  .catch((err) => {
    console.error('Erro na importação dos dados reais:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
