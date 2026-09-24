import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app';
import { prisma } from '../../src/server/db';
import { STATUS_ENTRADA } from '../../src/shared/constants';

describe('Gestão de Lojas (CRUD de PDVs)', () => {
  const criadasIds: string[] = [];

  afterAll(async () => {
    if (criadasIds.length > 0) {
      await prisma.foto.deleteMany({
        where: { auditoria: { lojaId: { in: criadasIds } } }
      });
      await prisma.auditoria.deleteMany({
        where: { lojaId: { in: criadasIds } }
      });
      await prisma.pesquisadorLoja.deleteMany({
        where: { lojaId: { in: criadasIds } }
      });
      await prisma.loja.deleteMany({
        where: { id: { in: criadasIds } }
      });
    }
    await prisma.$disconnect();
  });

  it('valida criação de loja: rejeita CNPJ com quantidade inválida de dígitos', async () => {
    const res = await request(app)
      .post('/api/admin/lojas')
      .send({
        rede: 'Monster Dog',
        nome: 'Loja Teste CNPJ Invalido',
        endereco: 'Rua das Flores, 123',
        cnpj: '12.345.678/0001' // Menos de 14 dígitos
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('CNPJ deve conter 14 dígitos numéricos');
  });

  it('cadastra uma nova loja com CNPJ válido e verifica na listagem', async () => {
    const cnpjTeste = '98.765.432/0001-99';
    const resCriar = await request(app)
      .post('/api/admin/lojas')
      .send({
        rede: 'Monster Dog',
        nome: 'Monster Dog - Estação Teste Central',
        endereco: 'Mezanino da Estação Central, São Paulo - SP',
        estacaoMetro: 'Central',
        cnpj: cnpjTeste
      });

    expect(resCriar.status).toBe(201);
    expect(resCriar.body).toHaveProperty('id');
    expect(resCriar.body.nome).toBe('Monster Dog - Estação Teste Central');
    expect(resCriar.body.cnpj).toBe('98765432000199');
    expect(resCriar.body.cnpjFormatado).toBe('98.765.432/0001-99');
    expect(resCriar.body.status).toBe('PENDENTE');

    const lojaId = resCriar.body.id;
    criadasIds.push(lojaId);

    // Verifica se aparece na listagem pública
    const resListar = await request(app).get(`/api/lojas?search=${lojaId}`);
    expect(resListar.status).toBe(200);
    const encontrada = resListar.body.find((l: any) => l.id === lojaId);
    expect(encontrada).toBeDefined();
    expect(encontrada.nome).toBe('Monster Dog - Estação Teste Central');
  });

  it('impede cadastrar duas lojas com o mesmo CNPJ', async () => {
    const resDuplicada = await request(app)
      .post('/api/admin/lojas')
      .send({
        rede: 'Ponto Alpha',
        nome: 'Ponto Alpha - Duplicada',
        endereco: 'Avenida Paulista, 1000',
        cnpj: '98.765.432/0001-99'
      });

    expect(resDuplicada.status).toBe(400);
    expect(resDuplicada.body.error).toContain('Já existe uma loja cadastrada com este CNPJ');
  });

  it('cadastra uma loja sem CNPJ e gera código interno automaticamente', async () => {
    const resSemCnpj = await request(app)
      .post('/api/admin/lojas')
      .send({
        rede: 'Better Pão de Queijo',
        nome: 'Better Pão de Queijo - Quiosque Sem CNPJ',
        endereco: 'Estação Moema, Piso 1'
      });

    expect(resSemCnpj.status).toBe(201);
    expect(resSemCnpj.body.cnpj.startsWith('99')).toBe(true);
    expect(resSemCnpj.body.cnpjFormatado).toBe('CNPJ não informado');

    criadasIds.push(resSemCnpj.body.id);
  });

  it('edita uma loja existente', async () => {
    const lojaId = criadasIds[0];
    const resEditar = await request(app)
      .put(`/api/admin/lojas/${lojaId}`)
      .send({
        rede: 'Ponto Alpha',
        nome: 'Ponto Alpha - Estação Teste Central Atualizada',
        endereco: 'Novo Endereço, 456',
        estacaoMetro: 'Central Nova',
        cnpj: '98.765.432/0001-99'
      });

    expect(resEditar.status).toBe(200);
    expect(resEditar.body.nome).toBe('Ponto Alpha - Estação Teste Central Atualizada');
    expect(resEditar.body.rede).toBe('Ponto Alpha');
    expect(resEditar.body.estacaoMetro).toBe('Central Nova');

    const resBuscar = await request(app).get(`/api/lojas/${lojaId}`);
    expect(resBuscar.status).toBe(200);
    expect(resBuscar.body.nome).toBe('Ponto Alpha - Estação Teste Central Atualizada');
  });

  it('exclui uma loja e remove do banco de dados', async () => {
    // Cria loja para ser excluída
    const resNova = await request(app)
      .post('/api/admin/lojas')
      .send({
        rede: 'Monster Dog',
        nome: 'Loja Para Deletar',
        endereco: 'Rua Provisoria, 999'
      });

    const idParaDeletar = resNova.body.id;

    const resDeletar = await request(app).delete(`/api/admin/lojas/${idParaDeletar}`);
    expect(resDeletar.status).toBe(200);
    expect(resDeletar.body.resultado).toBe('excluido');

    const checar = await prisma.loja.findUnique({ where: { id: idParaDeletar } });
    expect(checar).toBeNull();
  });
});
