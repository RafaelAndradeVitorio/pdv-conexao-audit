import { describe, it, expect } from 'vitest';
import {
  calcularNotaExposicao,
  consolidarResultados,
  GeladeiraAuditada,
  listarOportunidades,
  LojaAuditada
} from '../../src/shared/analytics';
import { CATEGORIAS_BEBIDA } from '../../src/shared/constants';

type Aud = NonNullable<LojaAuditada['auditoria']>;

const geladeiraPerfeita: GeladeiraAuditada = {
  ordem: 1,
  marcaVisual: 'Coca-Cola',
  posse: 'Coca-Cola/FEMSA',
  organizacao: 'Organizada',
  abastecimento: 'Cheia',
  visibilidade: 'Produtos facilmente identificáveis',
  concorrentesMisturados: false,
  monsterPresente: true,
  mapaBebidas: CATEGORIAS_BEBIDA.map((categoria) => ({ categoria, tem: true, marcas: '', concorrentes: false }))
};

const lojaPerfeita: Aud = {
  existeGeladeira: true,
  geladeiras: [geladeiraPerfeita],
  monsterPresente: true,
  marcasCocaPresentes: ['Coca-Cola', 'Monster'],
  espacoLivreCaixa: false,
  espacoDisponivel: 'Insuficiente',
  potencialDisplay: 'Baixo'
};

const loja = (id: string, auditoria: Aud | null, status = 'CONCLUIDA'): LojaAuditada => ({
  id,
  nome: `Loja ${id}`,
  rede: 'Monster Dog',
  status,
  auditoria
});

describe('Resultados do levantamento (Guia §13)', () => {
  it('nota máxima para geladeira organizada, cheia, visível e sem concorrentes', () => {
    expect(calcularNotaExposicao(geladeiraPerfeita)).toBe(100);
  });

  it('nota mínima para a pior avaliação em todos os critérios', () => {
    expect(
      calcularNotaExposicao({
        ...geladeiraPerfeita,
        organizacao: 'Pouco organizada',
        abastecimento: 'Quase vazia',
        visibilidade: 'Difícil identificar as marcas',
        concorrentesMisturados: true
      })
    ).toBe(0);
  });

  it('geladeira com avaliação antiga incompleta não recebe nota', () => {
    expect(calcularNotaExposicao({ ...geladeiraPerfeita, visibilidade: null })).toBeNull();
  });

  it('aponta concorrentes na geladeira FEMSA e Monster fora da geladeira como oportunidades', () => {
    const ops = listarOportunidades({
      ...lojaPerfeita,
      geladeiras: [{ ...geladeiraPerfeita, concorrentesMisturados: true, monsterPresente: false }],
      potencialDisplay: 'Alto'
    });
    expect(ops).toEqual([
      'Concorrentes na geladeira FEMSA',
      'Monster fora da geladeira',
      'Espaço para display (potencial alto)'
    ]);
  });

  it('com várias geladeiras, a oportunidade diz de qual geladeira é', () => {
    const ops = listarOportunidades({
      ...lojaPerfeita,
      geladeiras: [geladeiraPerfeita, { ...geladeiraPerfeita, ordem: 2, abastecimento: 'Quase vazia' }]
    });
    expect(ops).toEqual(['Geladeira 2: Abastecimento baixo']);
  });

  it('consolida geladeiras, concorrência FEMSA, Monster, ranking e display', () => {
    const r = consolidarResultados([
      loja('a', lojaPerfeita),
      loja('b', {
        ...lojaPerfeita,
        geladeiras: [
          {
            ...geladeiraPerfeita,
            abastecimento: 'Baixa ocupação',
            concorrentesMisturados: true,
            concorrentesDetalhes: 'Pepsi na 2ª prateleira'
          }
        ],
        potencialDisplay: 'Médio',
        espacoDisponivel: 'Limitado'
      }),
      loja('c', {
        existeGeladeira: false,
        monsterPresente: false,
        potencialDisplay: 'Alto',
        espacoDisponivel: 'Bom',
        marcasCocaPresentes: ['Coca-Cola']
      }),
      loja('d', null, 'FINALIZADA_INOPERANTE'),
      loja('e', null, 'PENDENTE')
    ]);

    expect(r.lojasVisitadas).toBe(4);
    expect(r.lojasAbertas).toBe(3);
    expect(r.lojasInoperantes).toBe(1);
    expect(r.geladeiras.comGeladeira).toBe(2);
    expect(r.geladeiras.total).toBe(2);
    expect(r.geladeiras.semGeladeira).toBe(1);
    expect(r.geladeiras.porPosse.find((p) => p.rotulo === 'Coca-Cola/FEMSA')?.qtd).toBe(2);

    expect(r.concorrenciaFemsa).toMatchObject({ geladeirasFemsa: 2, comConcorrentes: 1 });
    expect(r.concorrenciaFemsa.lojas[0].detalhes).toBe('Pepsi na 2ª prateleira');

    expect(r.monster).toMatchObject({ presente: 2, naGeladeira: 2, foraDaGeladeira: 0, ausente: 1 });
    expect(r.marcas.cocaCola[0]).toEqual({ rotulo: 'Coca-Cola', qtd: 3 });
    expect(r.marcas.categorias.find((c) => c.categoria === 'Água')).toEqual({ categoria: 'Água', tem: 2, comConcorrente: 0 });

    expect(r.ranking.map((l) => [l.lojaId, l.nota])).toEqual([
      ['a', 100],
      ['b', 63],
      ['c', null]
    ]);
    expect(r.oportunidades.map((l) => l.lojaId)).toEqual(['b', 'c']);
    // Potencial alto antes de médio
    expect(r.display.map((l) => l.lojaId)).toEqual(['c', 'b']);
  });

  it('conta cada geladeira nos gráficos e no ranking quando a loja tem várias', () => {
    const r = consolidarResultados([
      loja('a', {
        ...lojaPerfeita,
        geladeiras: [
          { ...geladeiraPerfeita, identificacao: 'Vertical' },
          { ...geladeiraPerfeita, ordem: 2, posse: 'Monster', monsterPresente: true, concorrentesMisturados: true },
          { ...geladeiraPerfeita, ordem: 3, posse: 'Outro fornecedor', monsterPresente: false }
        ]
      }),
      loja('b', lojaPerfeita)
    ]);

    expect(r.geladeiras.comGeladeira).toBe(2);
    expect(r.geladeiras.total).toBe(4);
    expect(r.geladeiras.porPosse.find((p) => p.rotulo === 'Coca-Cola/FEMSA')?.qtd).toBe(2);
    expect(r.geladeiras.porPosse.find((p) => p.rotulo === 'Monster')?.qtd).toBe(1);
    expect(r.marcas.categorias.find((c) => c.categoria === 'Água')?.tem).toBe(4);

    expect(r.ranking).toHaveLength(4);
    expect(r.ranking.filter((l) => l.lojaId === 'a').map((l) => [l.geladeira, l.totalGeladeiras])).toEqual([
      [1, 3],
      [3, 3],
      [2, 3]
    ]);
    expect(r.ranking[0].identificacao).toBe('Vertical');

    const monsterA = r.monster.lojas.find((l) => l.lojaId === 'a');
    expect(monsterA).toMatchObject({ naGeladeira: true, geladeirasComMonster: 2, posseGeladeira: 'Coca-Cola/FEMSA, Monster' });
  });
});
