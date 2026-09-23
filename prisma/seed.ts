import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PESQUISADORES = [
  { id: 'pesq-01', nome: 'Ana Silva', telefone: '(11) 98765-4321' },
  { id: 'pesq-02', nome: 'Bruno Costa', telefone: '(11) 98765-4322' },
  { id: 'pesq-03', nome: 'Camila Santos', telefone: '(11) 98765-4323' },
  { id: 'pesq-04', nome: 'Diego Oliveira', telefone: '(11) 98765-4324' },
  { id: 'pesq-05', nome: 'Elena Rocha', telefone: '(11) 98765-4325' },
  { id: 'pesq-06', nome: 'Felipe Martins', telefone: '(11) 98765-4326' },
  { id: 'pesq-07', nome: 'Gabriela Lima', telefone: '(11) 98765-4327' },
  { id: 'pesq-08', nome: 'Henrique Souza', telefone: '(11) 98765-4328' },
  { id: 'pesq-09', nome: 'Isabela Mendes', telefone: '(11) 98765-4329' },
  { id: 'pesq-10', nome: 'Juliana Ribeiro', telefone: '(11) 98765-4330' },
];

export const ESTACOES_SP = [
  'Sé', 'Luz', 'República', 'Palmeiras-Barra Funda', 'Brás',
  'Tatuapé', 'Corinthians-Itaquera', 'Tamanduateí', 'Pinheiros', 'Paulista',
  'Consolação', 'Clínicas', 'Santana', 'Paraíso', 'Vila Mariana',
  'Santa Cruz', 'Jabaquara', 'Santo Amaro', 'Morumbi', 'Faria Lima',
  'Butantã', 'Osasco', 'São Caetano', 'Santo André', 'Mauá',
  'Vila Madalena', 'Trianon-Masp', 'Brigadeiro', 'Ana Rosa', 'São Bento',
  'Anhangabaú', 'Marechal Deodoro', 'Santa Cecília', 'Carrão', 'Penha',
  'Vila Prudente', 'Sacomã', 'Alto do Ipiranga', 'Santos-Imigrantes', 'Chácara Klabin',
  'São Judas', 'Conceição', 'Tucuruvi', 'Parada Inglesa', 'Jardim São Paulo',
  'Bresser-Mooca', 'Belém', 'Artur Alvim', 'Moema', 'Eucaliptos',
  'Campo Belo', 'Brooklin', 'Borba Gato', 'Largo Treze', 'Adolfo Pinheiro',
  'Giovanni Gronchi', 'Vila das Belezas'
];

function gerarCnpj(indice: number): { raw: string; formatado: string } {
  const base = (12345678000100 + indice).toString().padStart(14, '0');
  const formatado = `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/${base.slice(8, 12)}-${base.slice(12, 14)}`;
  return { raw: base, formatado };
}

export function gerar57Lojas() {
  const redes = ['Monster Dog', 'Ponto Alpha', 'Better Pão de Queijo'] as const;
  const lojas = [];

  for (let i = 0; i < 57; i++) {
    const rede = redes[i % 3];
    const estacao = ESTACOES_SP[i];
    const { raw, formatado } = gerarCnpj(i + 1);
    const id = `loja-${(i + 1).toString().padStart(2, '0')}`;

    lojas.push({
      id,
      rede,
      nome: `${rede} - Estação ${estacao}`,
      endereco: `Mezanino da Estação de Metrô ${estacao}, Linha ${i % 2 === 0 ? '1-Azul' : '3-Vermelha'}, São Paulo - SP`,
      estacaoMetro: estacao,
      cnpj: raw,
      cnpjFormatado: formatado,
      status: 'PENDENTE' as const
    });
  }

  return lojas;
}

export async function main() {
  console.log('--- Iniciando Seed do Banco de Dados PDV Conexao ---');

  // Limpeza prévia para idempotência
  console.log('Limpando dados anteriores...');
  await prisma.foto.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.loja.deleteMany();
  await prisma.pesquisador.deleteMany();

  // Inserção dos 10 Pesquisadores
  console.log('Cadastrando 10 pesquisadores...');
  for (const pesq of PESQUISADORES) {
    await prisma.pesquisador.create({
      data: pesq
    });
  }
  console.log('✓ 10 Pesquisadores inseridos.');

  // Inserção das 57 Lojas
  console.log('Cadastrando 57 Lojas na RMSP...');
  const lojas = gerar57Lojas();
  for (const loja of lojas) {
    await prisma.loja.create({
      data: loja
    });
  }
  console.log('✓ 57 Lojas cadastradas com sucesso.');

  console.log('--- Seed Concluído com Sucesso! ---');
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .catch((e) => {
      console.error('Erro ao executar seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
