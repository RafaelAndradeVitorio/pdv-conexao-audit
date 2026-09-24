import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app';
import { prisma } from '../../src/server/db';
import { STATUS_ENTRADA, CATEGORIAS_BEBIDA, TIPOS_FOTO } from '../../src/shared/constants';

/** Payload válido de loja aberta com geladeira, sem concorrentes e sem espaço no caixa */
function payloadLojaAberta(lojaId: string, pesquisadorId: string) {
  return {
    lojaId,
    pesquisadorId,
    statusEntrada: STATUS_ENTRADA.ABERTA,
    existeGeladeira: true,
    marcaVisualGeladeira: 'Coca-Cola',
    posseGeladeira: 'Coca-Cola/FEMSA',
    monsterPresente: true,
    monsterNaGeladeira: true,
    mapaBebidas: CATEGORIAS_BEBIDA.map((categoria) => ({ categoria, tem: true, marcas: '', concorrentes: false })),
    marcasCocaPresentes: ['Coca-Cola', 'Monster', 'Sprite'],
    organizacaoGeladeira: 'Organizada',
    abastecimentoGeladeira: 'Cheia',
    visibilidadeMarcas: 'Produtos facilmente identificáveis',
    concorrentesMisturados: false,
    espacoLivreCaixa: false,
    espacoDisponivel: 'Limitado',
    outrosDisplaysImpulso: false,
    potencialDisplay: 'Médio',
    fotos: ['foto_fachada', 'foto_geladeira', 'foto_marcas', 'foto_detalhe', 'foto_caixa'].map((tipo) => ({
      tipo,
      url: `/uploads/${lojaId}/${tipo}.webp`,
      tamanhoBytes: 300000
    }))
  };
}


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
    // O coordenador pode cadastrar/excluir lojas: compara com o banco em vez de fixar 57
    expect(res.body.length).toBe(await prisma.loja.count());

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
      ...payloadLojaAberta('loja-10', 'pesq-01'),
      descricaoOportunidade: 'Espaço excelente em frente ao balcão'
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
    const duplicatePayload = payloadLojaAberta('loja-10', 'pesq-02');

    const res = await request(app)
      .post('/api/auditorias')
      .send(duplicatePayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Esta loja já foi auditada por');
    expect(res.body).toHaveProperty('pesquisadorNome');
    expect(res.body).toHaveProperty('auditadaEm');
  });

  it('RACE CONDITION CONCURRENCY: requisição simultânea de 2 pesquisadores no mesmo milissegundo deve aceitar exatamente 1 (201) e rejeitar o concorrente com 409', async () => {

    const payloadPesq1 = payloadLojaAberta('loja-12', 'pesq-04');

    const payloadPesq2 = payloadLojaAberta('loja-12', 'pesq-05');

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

  it('GET /api/auditorias/resultados - deve consolidar as respostas das perguntas finais do guia', async () => {
    const res = await request(app).get('/api/auditorias/resultados');
    expect(res.status).toBe(200);
    expect(res.body.totalLojas).toBe(57);
    expect(res.body.lojasAbertas).toBeGreaterThan(0);
    expect(res.body.geladeiras.porPosse.map((p: any) => p.rotulo)).toContain('Coca-Cola/FEMSA');
    expect(res.body.marcas.categorias).toHaveLength(6);
    expect(Array.isArray(res.body.ranking)).toBe(true);
    expect(Array.isArray(res.body.display)).toBe(true);
  });

  it('GET /api/export/csv - deve gerar CSV com colunas formatadas e links clicáveis de mídia', async () => {
    const res = await request(app).get('/api/export/csv');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('"ID Loja";"Rede";"Nome da Loja"');
    for (const t of TIPOS_FOTO) {
      expect(res.text).toContain(`Foto ${t.arquivo} (URL)`);
    }
    expect(res.text).toContain('Refrigerantes - Tem?');
    expect(res.text).toContain('Visibilidade das Marcas');
    expect(res.text).toContain('Espaço Disponível');
  });

  it('GET /api/export/zip - deve iniciar streaming de arquivo ZIP estruturado com nomes das lojas', async () => {
    const res = await request(app).get('/api/export/zip');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/zip');
  });
});
