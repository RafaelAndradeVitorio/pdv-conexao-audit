import { prisma } from '../db';
import { REDES_PDV } from '../../shared/constants';

const PESQUISADORES = [
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

const ESTACOES_SP = [
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

/**
 * Garante que em produção no Railway ou qualquer nova máquina,
 * os 10 pesquisadores e as 57 lojas sejam cadastrados automaticamente
 * sem apagar dados pré-existentes.
 */
export async function bootstrapDatabase(): Promise<void> {
  // Em produção o cadastro real vem de `npm run db:importar`; dados fictícios só se pedido explicitamente
  if (process.env.NODE_ENV === 'production' && process.env.BOOTSTRAP_DADOS_FICTICIOS !== 'true') {
    const [lojas, pesquisadores] = await Promise.all([prisma.loja.count(), prisma.pesquisador.count()]).catch(() => [1, 1]);
    if (lojas === 0 || pesquisadores === 0) {
      console.warn('[Bootstrap] Banco sem lojas ou promotores. Importe o cadastro real com: npm run db:importar');
    }
    return;
  }

  try {
    const totalPesquisadores = await prisma.pesquisador.count();
    if (totalPesquisadores === 0) {
      console.log('[Bootstrap] Cadastrando os 10 pesquisadores oficiais...');
      for (const p of PESQUISADORES) {
        await prisma.pesquisador.upsert({
          where: { id: p.id },
          create: p,
          update: {}
        });
      }
      console.log('[Bootstrap] ✓ 10 pesquisadores cadastrados.');
    }

    const totalLojas = await prisma.loja.count();
    if (totalLojas === 0) {
      console.log('[Bootstrap] Cadastrando as 57 lojas de SP com dados de CNPJ e estação...');
      for (let i = 0; i < 57; i++) {
        const rede = REDES_PDV[i % REDES_PDV.length];
        const estacao = ESTACOES_SP[i];
        const { raw, formatado } = gerarCnpj(i + 1);
        const id = `loja-${(i + 1).toString().padStart(2, '0')}`;

        await prisma.loja.upsert({
          where: { id },
          create: {
            id,
            rede,
            nome: `${rede} - Estação ${estacao}`,
            endereco: `Mezanino da Estação de Metrô ${estacao}, Linha ${i % 2 === 0 ? '1-Azul' : '3-Vermelha'}, São Paulo - SP`,
            estacaoMetro: estacao,
            cnpj: raw,
            cnpjFormatado: formatado,
            status: 'PENDENTE'
          },
          update: {}
        });
      }
      console.log('[Bootstrap] ✓ 57 lojas cadastradas com sucesso.');
    }
  } catch (error) {
    console.error('[Bootstrap] Aviso: Falha ao executar bootstrap inicial do banco:', error);
  }
}
