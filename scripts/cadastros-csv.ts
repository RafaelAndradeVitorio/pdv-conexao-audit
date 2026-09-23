import { REDES_PDV } from '../src/shared/constants';

/**
 * Leitura e validação dos CSVs de cadastro enviados pelo cliente (lojas e promotores).
 * Separador ; ou , (detectado pelo cabeçalho), aspas opcionais, com ou sem BOM do Excel.
 */

export interface LojaCsv {
  linha: number;
  rede: string;
  nome: string;
  endereco: string;
  estacaoMetro: string | null;
  cnpj: string | null;
}

export interface PesquisadorCsv {
  linha: number;
  nome: string;
  telefone: string;
}

export interface Leitura<T> {
  registros: T[];
  erros: string[];
}

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function dividirLinha(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        aspas = !aspas;
      }
    } else if (c === sep && !aspas) {
      campos.push(atual.trim());
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual.trim());
  return campos;
}

/** Converte o CSV em objetos com as chaves do cabeçalho normalizadas (sem acento, minúsculas, _ no lugar de espaço) */
export function lerCsv(conteudo: string): { cabecalho: string[]; linhas: { linha: number; campos: Record<string, string> }[] } {
  const texto = conteudo.replace(/^﻿/, '');
  const todas = texto.split(/\r?\n/);
  const primeira = todas.findIndex((l) => l.trim() !== '');
  if (primeira < 0) return { cabecalho: [], linhas: [] };

  const sep = (todas[primeira].match(/;/g) || []).length >= (todas[primeira].match(/,/g) || []).length ? ';' : ',';
  const cabecalho = dividirLinha(todas[primeira], sep).map((h) => semAcento(h).replace(/\s+/g, '_'));

  const linhas = [];
  for (let i = primeira + 1; i < todas.length; i++) {
    if (todas[i].trim() === '') continue;
    const valores = dividirLinha(todas[i], sep);
    const campos: Record<string, string> = {};
    cabecalho.forEach((h, idx) => (campos[h] = valores[idx] ?? ''));
    linhas.push({ linha: i + 1, campos });
  }
  return { cabecalho, linhas };
}

const primeiro = (campos: Record<string, string>, nomes: string[]) => {
  for (const n of nomes) if (campos[n]?.trim()) return campos[n].trim();
  return '';
};

export function lerLojas(conteudo: string): Leitura<LojaCsv> {
  const { cabecalho, linhas } = lerCsv(conteudo);
  const erros: string[] = [];
  const registros: LojaCsv[] = [];

  for (const obrig of ['rede', 'nome']) {
    if (!cabecalho.includes(obrig)) erros.push(`Coluna obrigatória ausente: "${obrig}"`);
  }
  if (erros.length) return { registros, erros };

  const cnpjsVistos = new Map<string, number>();
  for (const { linha, campos } of linhas) {
    const redeTxt = primeiro(campos, ['rede']);
    const rede = REDES_PDV.find((r) => semAcento(r) === semAcento(redeTxt));
    const nome = primeiro(campos, ['nome', 'loja', 'nome_da_loja']);
    const estacao = primeiro(campos, ['estacao', 'estacao_metro', 'estacao_de_metro']) || null;
    const endereco = primeiro(campos, ['endereco']) || (estacao ? `Estação de Metrô ${estacao}` : '');
    const cnpjDigitos = primeiro(campos, ['cnpj']).replace(/\D/g, '');

    if (!rede) erros.push(`Linha ${linha}: rede "${redeTxt}" inválida (use ${REDES_PDV.join(', ')})`);
    if (nome.length < 2) erros.push(`Linha ${linha}: nome da loja vazio`);
    if (endereco.length < 5) erros.push(`Linha ${linha}: informe o endereço ou a estação de metrô`);
    if (cnpjDigitos && cnpjDigitos.length !== 14) erros.push(`Linha ${linha}: CNPJ deve ter 14 dígitos`);
    if (cnpjDigitos) {
      const repetido = cnpjsVistos.get(cnpjDigitos);
      if (repetido) erros.push(`Linha ${linha}: CNPJ repetido (também na linha ${repetido})`);
      cnpjsVistos.set(cnpjDigitos, linha);
    }

    if (rede && nome.length >= 2 && endereco.length >= 5) {
      registros.push({ linha, rede, nome, endereco, estacaoMetro: estacao, cnpj: cnpjDigitos || null });
    }
  }
  return { registros, erros };
}

export function lerPesquisadores(conteudo: string): Leitura<PesquisadorCsv> {
  const { cabecalho, linhas } = lerCsv(conteudo);
  const erros: string[] = [];
  const registros: PesquisadorCsv[] = [];
  if (!cabecalho.includes('nome')) return { registros, erros: ['Coluna obrigatória ausente: "nome"'] };

  for (const { linha, campos } of linhas) {
    const nome = primeiro(campos, ['nome', 'promotor', 'pesquisador']);
    const telefone = primeiro(campos, ['telefone', 'celular', 'whatsapp']);
    if (nome.length < 2) erros.push(`Linha ${linha}: nome vazio`);
    else if (telefone.replace(/\D/g, '').length < 8) erros.push(`Linha ${linha}: telefone inválido para ${nome}`);
    else registros.push({ linha, nome, telefone });
  }
  return { registros, erros };
}

export function formatarCnpj(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/**
 * Loja sem CNPJ no cadastro do cliente: o app usa o CNPJ como chave única (pasta das fotos),
 * então gera um código interno que começa com 99 e não é exibido como CNPJ.
 */
export function codigoInterno(sequencial: number): string {
  return `99${sequencial.toString().padStart(12, '0')}`;
}

export const CNPJ_NAO_INFORMADO = 'CNPJ não informado';
