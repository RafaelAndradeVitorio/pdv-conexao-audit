import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app';
import { prisma } from '../../src/server/db';
import { STATUS_ENTRADA } from '../../src/shared/constants';

describe('API Integration & Concurrency Tests (SDET Suite)', () => {
  beforeAll(async () => {
    // Limpa auditorias de teste para garantir idempotência
    await prisma.foto.deleteMany({
      where: { auditoria: { lojaId: { in: ['loja-10', 'loja-11', 'loja-12'] } } }
    });
    await prisma.auditoria.deleteMany({
      where: { lojaId: { in: ['loja-10', 'loja-11', 'loja-12'] } }
    });
    await prisma.loja.updateMany({
      where: { id: { in: ['loja-10', 'loja-11', 'loja-12'] } },
      data: { status: 'PENDENTE', auditadaEm: null, pesquisadorId: null }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health - deve retornar status 200 e objeto de saúde', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBe('PDV Conexao Audit API');
  });

  it('GET /api/pesquisadores - deve listar os 10 pesquisadores cadastrados', async () => {
    const res = await request(app).get('/api/pesquisadores');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(10);
    expect(res.body[0]).toHaveProperty('nome');
    expect(res.body[0]).toHaveProperty('telefone');
  });

  it('GET /api/lojas - deve listar lojas cadastradas com filtros e busca', async () => {
    const res = await request(app).get('/api/lojas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(57);

    // Filtro por rede
    const resRede = await request(app).get('/api/lojas?rede=Monster+Dog');
    expect(resRede.status).toBe(200);
    expect(resRede.body.every((l: any) => l.rede === 'Monster Dog')).toBe(true);
  });

  it('POST /api/auditorias/upload-foto - deve retornar erro 400 se CNPJ for omitido', async () => {
    const res = await request(app)
      .post('/api/auditorias/upload-foto')
      .send({
        tipo: 'foto_fachada',
        base64: 'data:image/webp;base64,mockdata'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('CNPJ');
  });

  it('POST /api/auditorias - deve submeter auditoria completa de loja aberta', async () => {
    const auditPayload = {
      lojaId: 'loja-10',
      pesquisadorId: 'pesq-01',
      statusEntrada: STATUS_ENTRADA.ABERTA,
      existeGeladeira: true,
      marcaVisualGeladeira: 'Coca-Cola',
      posseGeladeira: 'FEMSA',
      organizacaoGeladeira: 'Cheia',
      monsterPresente: true,
      monsterNaGeladeira: true,
      marcasCocaPresentes: ['Coca-Cola', 'Monster', 'Sprite'],
      concorrentesMisturados: false,
      espacoLivreCaixa: true,
      espacoLadoTamanho: '50cm livres ao lado da máquina',
      outrosDisplaysImpulso: false,
      potencialDisplay: 'Alto',
      descricaoOportunidade: 'Espaço excelente em frente ao balcão',
      fotos: [
        { tipo: 'foto_fachada', url: '/uploads/loja-10/fachada.webp', tamanhoBytes: 320000 },
        { tipo: 'foto_geladeira', url: '/uploads/loja-10/geladeira.webp', tamanhoBytes: 310000 },
        { tipo: 'foto_marcas', url: '/uploads/loja-10/marcas.webp', tamanhoBytes: 300000 },
        { tipo: 'foto_concorrentes', url: '/uploads/loja-10/concorrentes.webp', tamanhoBytes: 290000 },
        { tipo: 'foto_caixa', url: '/uploads/loja-10/caixa.webp', tamanhoBytes: 330000 },
        { tipo: 'foto_display', url: '/uploads/loja-10/display.webp', tamanhoBytes: 340000 }
      ]
    };

    const res = await request(app)
      .post('/api/auditorias')
      .send(auditPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('sucesso');
    expect(res.body.auditoria.lojaId).toBe('loja-10');
  });

  it('Idempotência de Status: deve atualizar a loja para CONCLUIDA e refletir imediatamente em GET /api/lojas', async () => {
    const res = await request(app).get('/api/lojas?search=loja-10');
    expect(res.status).toBe(200);
    const loja10 = res.body.find((l: any) => l.id === 'loja-10');
    expect(loja10).toBeDefined();
    expect(loja10.status).toBe('CONCLUIDA');
    expect(loja10.pesquisadorNome).toBe('Ana Silva');
  });

  it('POST /api/auditorias - TRAVA ANTI-DUPLICIDADE: deve rejeitar com 409 Conflict se loja já foi auditada', async () => {
    const duplicatePayload = {
      lojaId: 'loja-10',
      pesquisadorId: 'pesq-02',
      statusEntrada: STATUS_ENTRADA.ABERTA,
      existeGeladeira: true,
      marcaVisualGeladeira: 'Monster',
      posseGeladeira: 'Monster',
      organizacaoGeladeira: 'Boa',
      monsterPresente: true,
      monsterNaGeladeira: true,
      marcasCocaPresentes: ['Monster'],
      concorrentesMisturados: false,
      espacoLivreCaixa: true,
      potencialDisplay: 'Médio',
      fotos: [
        { tipo: 'foto_fachada', url: '/uploads/loja-10/fachada.webp' },
        { tipo: 'foto_geladeira', url: '/uploads/loja-10/geladeira.webp' },
        { tipo: 'foto_marcas', url: '/uploads/loja-10/marcas.webp' },
        { tipo: 'foto_concorrentes', url: '/uploads/loja-10/concorrentes.webp' },
        { tipo: 'foto_caixa', url: '/uploads/loja-10/caixa.webp' },
        { tipo: 'foto_display', url: '/uploads/loja-10/display.webp' }
      ]
    };

    const res = await request(app)
      .post('/api/auditorias')
      .send(duplicatePayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Esta loja já foi auditada por');
    expect(res.body).toHaveProperty('pesquisadorNome');
    expect(res.body).toHaveProperty('auditadaEm');
  });

  it('RACE CONDITION CONCURRENCY: requisição simultânea de 2 pesquisadores no mesmo milissegundo deve aceitar exatamente 1 (201) e rejeitar o concorrente com 409', async () => {
    const fotos = [
      { tipo: 'foto_fachada', url: '/uploads/loja-12/fachada.webp', tamanhoBytes: 300000 },
      { tipo: 'foto_geladeira', url: '/uploads/loja-12/geladeira.webp', tamanhoBytes: 300000 },
      { tipo: 'foto_marcas', url: '/uploads/loja-12/marcas.webp', tamanhoBytes: 300000 },
      { tipo: 'foto_concorrentes', url: '/uploads/loja-12/concorrentes.webp', tamanhoBytes: 300000 },
      { tipo: 'foto_caixa', url: '/uploads/loja-12/caixa.webp', tamanhoBytes: 300000 },
      { tipo: 'foto_display', url: '/uploads/loja-12/display.webp', tamanhoBytes: 300000 }
    ];

    const payloadPesq1 = {
      lojaId: 'loja-12',
      pesquisadorId: 'pesq-04',
      statusEntrada: STATUS_ENTRADA.ABERTA,
      existeGeladeira: true,
      marcaVisualGeladeira: 'Coca-Cola',
      posseGeladeira: 'FEMSA',
      organizacaoGeladeira: 'Cheia',
      monsterPresente: true,
      monsterNaGeladeira: true,
      marcasCocaPresentes: ['Coca-Cola', 'Monster'],
      concorrentesMisturados: false,
      espacoLivreCaixa: true,
      potencialDisplay: 'Alto',
      fotos
    };

    const payloadPesq2 = {
      lojaId: 'loja-12',
      pesquisadorId: 'pesq-05',
      statusEntrada: STATUS_ENTRADA.ABERTA,
      existeGeladeira: true,
      marcaVisualGeladeira: 'Monster',
      posseGeladeira: 'Monster',
      organizacaoGeladeira: 'Boa',
      monsterPresente: true,
      monsterNaGeladeira: true,
      marcasCocaPresentes: ['Monster'],
      concorrentesMisturados: false,
      espacoLivreCaixa: true,
      potencialDisplay: 'Médio',
      fotos
    };

    // Disparo estritamente simultâneo via Promise.all
    const [res1, res2] = await Promise.all([
      request(app).post('/api/auditorias').send(payloadPesq1),
      request(app).post('/api/auditorias').send(payloadPesq2)
    ]);

    const statusCodes = [res1.status, res2.status].sort();
    // Exatamente uma requisição com 201 Created e outra com 409 Conflict
    expect(statusCodes).toEqual([201, 409]);

    const conflictResponse = res1.status === 409 ? res1 : res2;
    expect(conflictResponse.body.error).toContain('Esta loja já foi auditada por');
  });

  it('POST /api/auditorias - fluxo de loja inoperante com justificativa e foto 01', async () => {
    const inoperantePayload = {
      lojaId: 'loja-11',
      pesquisadorId: 'pesq-03',
      statusEntrada: STATUS_ENTRADA.FECHADA,
      justificativaInoperante: 'Loja fechada com tapumes devido a reformas na linha do metrô',
      fotos: [
        { tipo: 'foto_fachada', url: '/uploads/loja-11/fachada.webp', tamanhoBytes: 310000 }
      ]
    };

    const res = await request(app)
      .post('/api/auditorias')
      .send(inoperantePayload);

    expect(res.status).toBe(201);
    expect(res.body.auditoria.statusEntrada).toBe(STATUS_ENTRADA.FECHADA);
  });

  it('GET /api/auditorias/dashboard - deve consolidar contagens e percentuais', async () => {
    const res = await request(app).get('/api/auditorias/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalLojas');
    expect(res.body).toHaveProperty('totalConcluidas');
    expect(res.body).toHaveProperty('totalInoperantes');
    expect(res.body).toHaveProperty('percentualConcluido');
    expect(res.body.totalLojas).toBe(57);
  });

  it('GET /api/export/csv - deve gerar CSV com colunas formatadas e links clicáveis de mídia', async () => {
    const res = await request(app).get('/api/export/csv');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('"ID Loja";"Rede";"Nome da Loja"');
    expect(res.text).toContain('Foto 01 - Fachada da Loja (URL)');
    expect(res.text).toContain('Foto 02 - Geladeira Fechada (URL)');
    expect(res.text).toContain('Foto 03 - Geladeira Aberta - Marcas (URL)');
    expect(res.text).toContain('Foto 04 - Concorrentes - Detalhes (URL)');
    expect(res.text).toContain('Foto 05 - Área do Caixa (URL)');
    expect(res.text).toContain('Foto 06 - Espaço do Display - Oportunidade (URL)');
  });

  it('GET /api/export/zip - deve iniciar streaming de arquivo ZIP estruturado com nomes das lojas', async () => {
    const res = await request(app).get('/api/export/zip');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
  });
});
