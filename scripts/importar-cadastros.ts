/**
 * Importa o cadastro real do cliente (lojas e promotores) a partir de CSV.
 *
 *   npm run db:importar -- --lojas docs/modelos/lojas.csv --pesquisadores docs/modelos/pesquisadores.csv
 *   npm run db:importar -- --lojas lojas.csv --aplicar
 *   npm run db:importar -- --lojas lojas.csv --aplicar --remover-ausentes
 *
 * Sem --aplicar só mostra o que mudaria (nada é gravado).
 * Lojas são casadas pelo CNPJ (ou pelo nome, quando o CSV não tem CNPJ); promotores pelo nome.
 * --remover-ausentes apaga do banco o que não está no CSV, mas nunca apaga quem já tem auditoria.
 */
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  CNPJ_NAO_INFORMADO,
  codigoInterno,
  formatarCnpj,
  lerLojas,
  lerPesquisadores
} from './cadastros-csv';

const prisma = new PrismaClient();

function argumento(nome: string): string | null {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

const aplicar = process.argv.includes('--aplicar');
const removerAusentes = process.argv.includes('--remover-ausentes');
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function lerArquivo(caminho: string): string {
  if (!fs.existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);
  return fs.readFileSync(caminho, 'utf-8');
}

function proximoId(prefixo: string, existentes: string[]): () => string {
  let n = existentes
    .map((id) => Number(id.replace(`${prefixo}-`, '')))
    .filter((v) => Number.isFinite(v))
    .reduce((max, v) => Math.max(max, v), 0);
  return () => `${prefixo}-${(++n).toString().padStart(2, '0')}`;
}

async function importarLojas(caminho: string) {
  const { registros, erros } = lerLojas(lerArquivo(caminho));
  if (erros.length) {
    console.error(`\n✗ ${caminho}: corrija antes de importar:\n  - ${erros.join('\n  - ')}`);
    process.exitCode = 1;
    return;
  }

  const atuais = await prisma.loja.findMany({ include: { auditoria: { select: { id: true } } } });
  const porCnpj = new Map(atuais.map((l) => [l.cnpj, l]));
  const porNome = new Map(atuais.map((l) => [normalizar(l.nome), l]));
  const novoId = proximoId('loja', atuais.map((l) => l.id));
  let seqInterno = atuais.filter((l) => l.cnpj.startsWith('99')).length;

  const usados = new Set<string>();
  const novas: string[] = [];
  const atualizadas: string[] = [];

  for (const r of registros) {
    const existente = (r.cnpj && porCnpj.get(r.cnpj)) || porNome.get(normalizar(r.nome));
    const cnpj = r.cnpj ?? existente?.cnpj ?? codigoInterno(++seqInterno);
    const dados = {
      rede: r.rede,
      nome: r.nome,
      endereco: r.endereco,
      estacaoMetro: r.estacaoMetro,
      cnpj,
      cnpjFormatado: r.cnpj ? formatarCnpj(r.cnpj) : CNPJ_NAO_INFORMADO
    };

    if (existente) {
      usados.add(existente.id);
      atualizadas.push(`${existente.id}  ${r.nome}`);
      if (aplicar) await prisma.loja.update({ where: { id: existente.id }, data: dados });
    } else {
      const id = novoId();
      novas.push(`${id}  ${r.nome}`);
      if (aplicar) await prisma.loja.create({ data: { id, ...dados, status: 'PENDENTE' } });
    }
  }

  const ausentes = atuais.filter((l) => !usados.has(l.id));
  const removiveis = ausentes.filter((l) => !l.auditoria);
  const comAuditoria = ausentes.filter((l) => l.auditoria);

  console.log(`\nLojas (${registros.length} no CSV)`);
  console.log(`  novas: ${novas.length}${novas.length ? '\n    ' + novas.join('\n    ') : ''}`);
  console.log(`  atualizadas: ${atualizadas.length}`);
  console.log(`  no banco mas fora do CSV: ${ausentes.length} (${removiveis.length} sem auditoria, ${comAuditoria.length} com auditoria)`);
  if (comAuditoria.length) {
    console.log(`    mantidas por já terem auditoria:\n    ${comAuditoria.map((l) => `${l.id}  ${l.nome}`).join('\n    ')}`);
  }

  if (aplicar && removerAusentes && removiveis.length) {
    await prisma.loja.deleteMany({ where: { id: { in: removiveis.map((l) => l.id) } } });
    console.log(`  removidas: ${removiveis.length}`);
  } else if (removiveis.length) {
    console.log('  (use --aplicar --remover-ausentes para apagar as que estão sem auditoria)');
  }
}

async function importarPesquisadores(caminho: string) {
  const { registros, erros } = lerPesquisadores(lerArquivo(caminho));
  if (erros.length) {
    console.error(`\n✗ ${caminho}: corrija antes de importar:\n  - ${erros.join('\n  - ')}`);
    process.exitCode = 1;
    return;
  }

  const atuais = await prisma.pesquisador.findMany({ include: { _count: { select: { auditorias: true } } } });
  const porNome = new Map(atuais.map((p) => [normalizar(p.nome), p]));
  const novoId = proximoId('pesq', atuais.map((p) => p.id));
  const usados = new Set<string>();
  let novos = 0;

  for (const r of registros) {
    const existente = porNome.get(normalizar(r.nome));
    if (existente) {
      usados.add(existente.id);
      if (aplicar) await prisma.pesquisador.update({ where: { id: existente.id }, data: { nome: r.nome, telefone: r.telefone } });
    } else {
      novos++;
      if (aplicar) await prisma.pesquisador.create({ data: { id: novoId(), nome: r.nome, telefone: r.telefone } });
    }
  }

  const ausentes = atuais.filter((p) => !usados.has(p.id));
  const removiveis = ausentes.filter((p) => p._count.auditorias === 0);

  console.log(`\nPromotores (${registros.length} no CSV)`);
  console.log(`  novos: ${novos}`);
  console.log(`  atualizados: ${usados.size}`);
  console.log(`  no banco mas fora do CSV: ${ausentes.length} (${removiveis.length} sem auditoria)`);

  if (aplicar && removerAusentes && removiveis.length) {
    await prisma.pesquisador.deleteMany({ where: { id: { in: removiveis.map((p) => p.id) } } });
    console.log(`  removidos: ${removiveis.length}`);
  }
}

async function main() {
  const lojas = argumento('--lojas');
  const pesquisadores = argumento('--pesquisadores');
  if (!lojas && !pesquisadores) {
    console.log('Uso: npm run db:importar -- --lojas lojas.csv [--pesquisadores pesquisadores.csv] [--aplicar] [--remover-ausentes]');
    console.log('Modelos em docs/modelos/.');
    return;
  }

  console.log(aplicar ? '== Importando (gravando no banco) ==' : '== Simulação: nada será gravado (use --aplicar) ==');
  if (lojas) await importarLojas(lojas);
  if (pesquisadores) await importarPesquisadores(pesquisadores);
}

main()
  .catch((err) => {
    console.error('Falha na importação:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
