import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app';
import { prisma } from '../../src/server/db';
import { _resetarTentativas } from '../../src/server/auth/coordenador';

describe('Acesso do coordenador por PIN', () => {
  const pinOriginal = process.env.COORD_PIN;

  beforeAll(() => {
    process.env.COORD_PIN = '482913';
    _resetarTentativas();
  });

  afterAll(async () => {
    if (pinOriginal === undefined) delete process.env.COORD_PIN;
    else process.env.COORD_PIN = pinOriginal;
    _resetarTentativas();
    await prisma.$disconnect();
  });

  it('bloqueia painel, exports e reset sem sessão', async () => {
    for (const rota of ['/api/auditorias/dashboard', '/api/auditorias/resultados', '/api/export/csv', '/api/lojas/loja-01']) {
      const res = await request(app).get(rota);
      expect(res.status, rota).toBe(401);
      expect(res.body.codigo).toBe('PIN_NECESSARIO');
    }
    expect((await request(app).post('/api/lojas/loja-01/reset')).status).toBe(401);
  });

  it('mantém abertas as rotas do pesquisador', async () => {
    expect((await request(app).get('/api/lojas')).status).toBe(200);
    expect((await request(app).get('/api/pesquisadores')).status).toBe(200);
  });

  it('PIN correto cria sessão por cookie HttpOnly que libera o painel', async () => {
    const sessaoAntes = await request(app).get('/api/coord/sessao');
    expect(sessaoAntes.body).toEqual({ pinConfigurado: true, autenticado: false });

    const login = await request(app).post('/api/coord/entrar').send({ pin: '482913' });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');

    const dash = await request(app).get('/api/auditorias/dashboard').set('Cookie', cookie.split(';')[0]);
    expect(dash.status).toBe(200);
  });

  it('cookie forjado não passa', async () => {
    const forjado = `pdv_coord=${Date.now() + 3600_000}.${'a'.repeat(64)}`;
    expect((await request(app).get('/api/auditorias/dashboard').set('Cookie', forjado)).status).toBe(401);
  });

  it('limita tentativas de PIN errado', async () => {
    _resetarTentativas();
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post('/api/coord/entrar').send({ pin: '000000' })).status).toBe(401);
    }
    const bloqueado = await request(app).post('/api/coord/entrar').send({ pin: '482913' });
    expect(bloqueado.status).toBe(429);
    _resetarTentativas();
  });
});
