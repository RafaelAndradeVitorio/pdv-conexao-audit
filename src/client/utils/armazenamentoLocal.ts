/**
 * Armazenamento no aparelho (IndexedDB) para rascunhos e fila de envio.
 * As fotos comprimidas (~300 KB cada) não cabem no localStorage.
 * Se o IndexedDB não estiver disponível (aba anônima, bloqueio do navegador),
 * cai para memória: o app continua funcionando, só não sobrevive a recarregar a página.
 */

export type Colecao = 'rascunhos' | 'fila';

const NOME_BANCO = 'pdv-conexao';
const VERSAO = 1;
const COLECOES: Colecao[] = ['rascunhos', 'fila'];

const memoria: Record<Colecao, Map<string, unknown>> = { rascunhos: new Map(), fila: new Map() };
let banco: Promise<IDBDatabase | null> | null = null;

function abrir(): Promise<IDBDatabase | null> {
  if (!banco) {
    banco = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open(NOME_BANCO, VERSAO);
        req.onupgradeneeded = () => {
          for (const c of COLECOES) {
            if (!req.result.objectStoreNames.contains(c)) req.result.createObjectStore(c);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return banco;
}

function executar<T>(colecao: Colecao, modo: IDBTransactionMode, acao: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) return reject(new Error('IndexedDB indisponível'));
        const req = acao(db.transaction(colecao, modo).objectStore(colecao));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function ler<T>(colecao: Colecao, chave: string): Promise<T | undefined> {
  try {
    return await executar<T | undefined>(colecao, 'readonly', (s) => s.get(chave));
  } catch {
    return memoria[colecao].get(chave) as T | undefined;
  }
}

export async function gravar<T>(colecao: Colecao, chave: string, valor: T): Promise<void> {
  memoria[colecao].set(chave, valor);
  try {
    await executar(colecao, 'readwrite', (s) => s.put(valor, chave));
  } catch {
    // Mantido só em memória
  }
}

export async function remover(colecao: Colecao, chave: string): Promise<void> {
  memoria[colecao].delete(chave);
  try {
    await executar(colecao, 'readwrite', (s) => s.delete(chave));
  } catch {
    // Mantido só em memória
  }
}

export async function listar<T>(colecao: Colecao): Promise<T[]> {
  try {
    return await executar<T[]>(colecao, 'readonly', (s) => s.getAll());
  } catch {
    return [...memoria[colecao].values()] as T[];
  }
}
