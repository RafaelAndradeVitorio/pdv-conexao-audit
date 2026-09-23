import { describe, it, expect } from 'vitest';
import {
  calcularNotaExposicao,
  consolidarResultados,
  listarOportunidades,
  LojaAuditada
} from '../../src/shared/analytics';
import { CATEGORIAS_BEBIDA } from '../../src/shared/constants';

type Aud = NonNullable<LojaAuditada['auditoria']>;

const geladeiraPerfeita: Aud = {
  existeGeladeira: true,
  marcaVisualGeladeira: 'Coca-Cola',
  posseGeladeira: 'Coca-Cola/FEMSA',
  organizacaoGeladeira: 'Organizada',
  abastecimentoGeladeira: 'Cheia',
  visibilidadeMarcas: 'Produtos facilmente identificáveis',
  concorrentesMisturados: false,
  monsterPresente: true,
  monsterNaGeladeira: true,
  marcasCocaPresentes: ['Coca-Cola', 'Monster'],
  mapaBebidas: CATEGORIAS_BEBIDA.map((categoria) => ({ categoria, tem: true, marcas: '', concorrentes: false })),
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
        organizacaoGeladeira: 'Pouco organizada',
        abastecimentoGeladeira: 'Quase vazia',
        visibilidadeMarcas: 'Difícil identificar as marcas',
        concorrentesMisturados: true
      })
    ).toBe(0);
  });

  it('loja sem geladeira ou com avaliação antiga incompleta não recebe nota', () => {
    expect(calcularNotaExposicao({ existeGeladeira: false })).toBeNull();
    expect(calcularNotaExposicao({ ...geladeiraPerfeita, visibilidadeMarcas: null })).toBeNull();
  });

  it('aponta concorrentes na geladeira FEMSA e Monster fora da geladeira como oportunidades', () => {
    const ops = listarOportunidades({
      ...geladeiraPerfeita,
      concorrentesMisturados: true,
      monsterNaGeladeira: false,
      potencialDisplay: 'Alto'
    });
    expect(ops).toEqual([
      'Concorrentes na geladeira FEMSA',
      'Monster fora da geladeira',
      'Espaço para display (potencial alto)'
    ]);
  });

  it('consolida geladeiras, concorrência FEMSA, Monster, ranking e display', () => {
    const r = consolidarResultados([
      loja('a', geladeiraPerfeita),
      loja('b', {
        ...geladeiraPerfeita,
        abastecimentoGeladeira: 'Baixa ocupação',
        concorrentesMisturados: true,
        concorrentesDetalhes: 'Pepsi na 2ª prateleira',
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
    // Potencial alto antes de médio
    expect(r.display.map((l) => l.lojaId)).toEqual(['c', 'b']);
  });
});
