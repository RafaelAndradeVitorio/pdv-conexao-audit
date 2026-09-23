import { describe, it, expect } from 'vitest';

describe('Dashboard Metric Computations', () => {
  it('deve calcular corretamente os percentuais e contagens de progresso', () => {
    const totalLojas = 57;
    const concluidas = 28;
    const inoperantes = 4;
    const visitadas = concluidas + inoperantes; // 32
    const pendentes = totalLojas - visitadas; // 25

    const percentual = Math.round((visitadas / totalLojas) * 100);

    expect(visitadas).toBe(32);
    expect(pendentes).toBe(25);
    expect(percentual).toBe(56); // 32/57 = 56.14%
  });

  it('deve lidar com 100% de conclusão', () => {
    const totalLojas = 57;
    const concluidas = 55;
    const inoperantes = 2;
    const percentual = Math.round(((concluidas + inoperantes) / totalLojas) * 100);

    expect(percentual).toBe(100);
  });
});
