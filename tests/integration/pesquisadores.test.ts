import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app';
import { prisma } from '../../src/server/db';
import { STATUS_ENTRADA } from '../../src/shared/constants';

const LOJAS = ['loja-52', 'loja-53'];

const auditoriaFechada = (lojaId: string, pesquisadorId: string) => ({
  lojaId,
  pesquisadorId,
  statusEntrada: STATUS_ENTRADA.FECHADA,
  justificativaInoperante: 'Loja fechada com grades durante a visita',
  fotos: [{ tipo: 'foto_fachada', url: `/uploads/${lojaId}/fachada.webp`, tamanhoBytes: 1000 }]
});

describe('Cadastro de pesquisadores e lojas liberadas', () => {
  const criados: string[] = [];

  const resetarLojas = async () => {
    await prisma.auditoria.deleteMany({ where: { lojaId: { in: LOJAS } } });
    await prisma.loja.updateMany({
      where: { id: { in: LOJAS } },
      data: { status: 'PENDENTE', auditadaEm: null, pesquisadorId: null }
    });
  };

  beforeAll(resetarLojas);

  afterAll(async () => {
    await resetarLojas();
    await prisma.pesquisador.deleteMany({ where: { id: { in: criados } } });
    await prisma.$disconnect();
  });

  it('valida o cadastro: lojas específicas exigem ao menos uma loja', async () => {
    const res = await request(app)
      .post('/api/admin/pesquisadores')
      .send({ nome: 'Teste Sem Lojas', telefone: '(11) 91234-5678', todasLojas: false, lojaIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Selecione ao menos uma loja');
  });

  it('cadastra com lojas específicas e só permite auditar essas lojas', async () => {
    const criar = await request(app)
      .post('/api/admin/pesquisadores')
      .send({ nome: 'Teste Restrito', telefone: '(11) 91234-5678', todasLojas: false, lojaIds: ['loja-52'] });
    expect(criar.status).toBe(201);
    const id = criar.body.id;
    criados.push(id);
    expect(criar.body).toMatchObject({ ativo: true, todasLojas: false, lojaIds: ['loja-52'], totalAuditorias: 0 });

    const publico = await request(app).get('/api/pesquisadores');
    expect(publico.body.find((p: any) => p.id === id)).toMatchObject({ todasLojas: false, lojaIds: ['loja-52'] });

    const negado = await request(app).post('/api/auditorias').send(auditoriaFechada('loja-53', id));
    expect(negado.status).toBe(403);
    expect(negado.body.error).toContain('não está liberada');

    const aceito = await request(app).post('/api/auditorias').send(auditoriaFechada('loja-52', id));
    expect(aceito.status).toBe(201);
  });

  it('edita para todas as lojas', async () => {
    const id = criados[0];
    const res = await request(app)
      .put(`/api/admin/pesquisadores/${id}`)
      .send({ nome: 'Teste Liberado', telefone: '(11) 91234-5678', todasLojas: true, lojaIds: [] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Teste Liberado', todasLojas: true, lojaIds: [] });
    expect((await request(app).post('/api/auditorias').send(auditoriaFechada('loja-53', id))).status).toBe(201);
  });

  it('excluir quem tem auditoria só desativa; desativado some do app e não pode enviar', async () => {
    const id = criados[0];
    const res = await request(app).delete(`/api/admin/pesquisadores/${id}`);
    expect(res.body).toEqual({ resultado: 'desativado', totalAuditorias: 2 });

    const publico = await request(app).get('/api/pesquisadores');
    expect(publico.body.some((p: any) => p.id === id)).toBe(false);

    const admin = await request(app).get('/api/admin/pesquisadores');
    expect(admin.body.find((p: any) => p.id === id)).toMatchObject({ ativo: false, totalAuditorias: 2 });

    await resetarLojas();
    const negado = await request(app).post('/api/auditorias').send(auditoriaFechada('loja-52', id));
    expect(negado.status).toBe(403);
  });

  it('excluir quem não tem auditoria apaga o cadastro', async () => {
    const criar = await request(app)
      .post('/api/admin/pesquisadores')
      .send({ nome: 'Teste Temporario', telefone: '(11) 95555-0000' });
    expect(criar.status).toBe(201);
    const res = await request(app).delete(`/api/admin/pesquisadores/${criar.body.id}`);
    expect(res.body).toEqual({ resultado: 'excluido', totalAuditorias: 0 });
    expect(await prisma.pesquisador.findUnique({ where: { id: criar.body.id } })).toBeNull();
  });
});
