import { prisma } from '../db';
import { REAL_RESEARCHERS, REAL_STORES } from './realData';
import { backfillGeladeiras } from '../services/geladeiras';

/**
 * Garante que ao iniciar a aplicação em qualquer ambiente (local ou nuvem Railway),
 * os 9 pesquisadores oficiais e as 59 lojas reais estejam cadastrados com a vinculação restrita de lojas.
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    const temGiovani = await prisma.pesquisador.findUnique({ where: { id: 'pesq-giovani' } });

    if (!temGiovani) {
      console.log('[Bootstrap] Atualizando banco de produção para os 9 pesquisadores oficiais e 59 lojas reais...');

      // Zerar dados antigos/fictícios para sincronizar a produção com os dados oficiais
      await prisma.foto.deleteMany({}).catch(() => undefined);
      await prisma.auditoria.deleteMany({}).catch(() => undefined);
      await prisma.pesquisadorLoja.deleteMany({}).catch(() => undefined);
      await prisma.loja.deleteMany({}).catch(() => undefined);
      await prisma.pesquisador.deleteMany({}).catch(() => undefined);

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

      for (const r of REAL_RESEARCHERS) {
        const lojaIds = r.lojasNums.map((n) => numParaLojaId.get(n)!);

        await prisma.pesquisador.create({
          data: {
            id: r.id,
            nome: r.nome,
            telefone: r.telefone,
            ativo: true,
            todasLojas: false,
            lojasPermitidas: {
              create: lojaIds.map((lojaId) => ({ lojaId }))
            }
          }
        });
      }

      console.log('[Bootstrap] ✓ Banco de produção atualizado com 59 lojas reais e 9 pesquisadores cadastrados com sucesso!');
    }
  } catch (error) {
    console.error('[Bootstrap] Aviso: Falha ao executar bootstrap inicial do banco:', error);
  }

  try {
    await backfillGeladeiras();
  } catch (error) {
    console.error('[Bootstrap] Aviso: Falha ao converter auditorias antigas para geladeiras:', error);
  }
}
