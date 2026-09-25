import { prisma } from '../db';
import { REAL_RESEARCHERS, REAL_STORES } from './realData';

/**
 * Garante que ao iniciar a aplicação em qualquer ambiente (local ou nuvem Railway),
 * os 9 pesquisadores oficiais e as 59 lojas reais estejam cadastrados com a vinculação restrita de lojas.
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    const totalLojas = await prisma.loja.count();
    const totalPesquisadores = await prisma.pesquisador.count();

    if (totalLojas === 0 || totalPesquisadores === 0) {
      console.log('[Bootstrap] Populando os 9 pesquisadores oficiais e as 59 lojas reais...');

      const numParaLojaId = new Map<number, string>();

      for (const s of REAL_STORES) {
        const id = `loja-${s.num.toString().padStart(2, '0')}`;
        numParaLojaId.set(s.num, id);

        await prisma.loja.upsert({
          where: { id },
          create: {
            id,
            rede: s.rede,
            nome: s.nome,
            cnpj: s.cnpjRaw,
            cnpjFormatado: s.cnpjFormatado,
            endereco: s.endereco,
            estacaoMetro: s.estacaoMetro,
            status: 'PENDENTE'
          },
          update: {}
        });
      }

      for (const r of REAL_RESEARCHERS) {
        const lojaIds = r.lojasNums.map((n) => numParaLojaId.get(n)!);

        await prisma.pesquisador.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            nome: r.nome,
            telefone: r.telefone,
            ativo: true,
            todasLojas: false,
            lojasPermitidas: {
              create: lojaIds.map((lojaId) => ({ lojaId }))
            }
          },
          update: {}
        });
      }

      console.log('[Bootstrap] ✓ 59 lojas reais e 9 pesquisadores cadastrados com sucesso.');
    }
  } catch (error) {
    console.error('[Bootstrap] Aviso: Falha ao executar bootstrap inicial do banco:', error);
  }
}
