import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { codigoInterno, lerLojas, lerPesquisadores } from '../../scripts/cadastros-csv';

describe('Importação do cadastro do cliente (CSV)', () => {
  it('lê o modelo de lojas com BOM, ; e colunas opcionais', () => {
    const csv = fs.readFileSync(path.resolve(__dirname, '../../docs/modelos/lojas.csv'), 'utf-8');
    const { registros, erros } = lerLojas(csv);
    expect(erros).toEqual([]);
    expect(registros).toHaveLength(3);
    expect(registros[0]).toMatchObject({ rede: 'Monster Dog', cnpj: '12345678000101', estacaoMetro: 'Sé' });
    // Sem endereço: usa a estação
    expect(registros[1]).toMatchObject({ endereco: 'Estação de Metrô Luz', cnpj: null });
  });

  it('aceita vírgula, aspas e rede sem acento ou em maiúsculas', () => {
    const csv = 'Rede,Nome,Endereço\n"BETTER PAO DE QUEIJO","Better - Loja ""Centro""","Rua A, 10"\n';
    const { registros, erros } = lerLojas(csv);
    expect(erros).toEqual([]);
    expect(registros[0]).toMatchObject({ rede: 'Better Pão de Queijo', nome: 'Better - Loja "Centro"', endereco: 'Rua A, 10' });
  });

  it('aponta a linha de cada erro', () => {
    const csv = 'rede;nome;endereco;cnpj\nSubway;Loja X;Rua B, 1;\nMonster Dog;Loja Y;;123\nPonto Alpha;Loja Z;Rua C, 2;11222333000144\nPonto Alpha;Loja W;Rua D, 3;11.222.333/0001-44\n';
    const { erros } = lerLojas(csv);
    expect(erros).toEqual([
      'Linha 2: rede "Subway" inválida (use Monster Dog, Ponto Alpha, Better Pão de Queijo)',
      'Linha 3: informe o endereço ou a estação de metrô',
      'Linha 3: CNPJ deve ter 14 dígitos',
      'Linha 5: CNPJ repetido (também na linha 4)'
    ]);
  });

  it('exige as colunas rede e nome', () => {
    expect(lerLojas('loja;endereco\nA;B\n').erros).toEqual(['Coluna obrigatória ausente: "rede"', 'Coluna obrigatória ausente: "nome"']);
  });

  it('lê promotores e valida telefone', () => {
    const csv = fs.readFileSync(path.resolve(__dirname, '../../docs/modelos/pesquisadores.csv'), 'utf-8');
    expect(lerPesquisadores(csv).registros).toHaveLength(2);
    expect(lerPesquisadores('nome;telefone\nAna;123\n').erros).toEqual(['Linha 2: telefone inválido para Ana']);
  });

  it('gera código interno de 14 dígitos para loja sem CNPJ', () => {
    expect(codigoInterno(7)).toBe('99000000000007');
  });
});
