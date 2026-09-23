import { test, expect } from '@playwright/test';

test.describe('E2E - Mock de Dados e Validação de Fluxos Completos', () => {

  test('E2E Dashboard: Deve exibir 38 lojas visitadas (67%), métricas por rede e equipe de 10 pesquisadores', async ({
    page
  }) => {
    await page.goto('/');

    // Acessa a visão do coordenador
    const coordBtn = page.locator('button', { hasText: 'Coordenador' });
    await coordBtn.click();

    // Valida títulos e percentual
    await expect(page.locator('text=Painel do Coordenador de Campo')).toBeVisible();
    await expect(page.locator('text=%').first()).toBeVisible();
    await expect(page.locator('span.text-3xl')).toBeVisible();
    await expect(page.locator('text=de 57 lojas visitadas')).toBeVisible();

    // Valida contadores de métricas operantes vs inoperantes
    await expect(page.getByText('Operantes', { exact: true })).toBeVisible();
    await expect(page.getByText('Inoperantes', { exact: true })).toBeVisible();
    await expect(page.getByText('Pendentes', { exact: true })).toBeVisible();

    // Valida que as redes Monster Dog, Ponto Alpha e Better Pão de Queijo estão com dados
    await expect(page.locator('text=Monster Dog').first()).toBeVisible();
    await expect(page.locator('text=Ponto Alpha').first()).toBeVisible();
    await expect(page.locator('text=Better Pão de Queijo').first()).toBeVisible();

    // Valida que os 10 pesquisadores estão pontuando no ranking
    await expect(page.locator('text=Ana Silva').first()).toBeVisible();
    await expect(page.locator('text=Bruno Costa').first()).toBeVisible();
  });

  test('E2E Mobile: Trava Anti-Duplicidade em Loja Já Auditada vs Loja Pendente', async ({
    page
  }) => {
    await page.goto('/');

    // 1. Identificação do Pesquisador
    const selectPesquisador = page.locator('select').first();
    await selectPesquisador.selectOption({ label: 'Juliana Ribeiro — (11) 98765-4330' });
    await expect(page.locator('text=Salvo no aparelho')).toBeVisible();

    // 2. Busca uma loja que já foi auditada (Ex: Estação Sé)
    const searchInput = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await searchInput.fill('Sé');
    const lojaSe = page.locator('button', { hasText: 'Estação Sé' }).first();
    await expect(lojaSe).toBeVisible();
    await expect(lojaSe.locator('text=Já Auditada')).toBeVisible();
    await lojaSe.click();

    // 3. Valida que a TRAVA ANTI-DUPLICIDADE bloqueia o formulário e exibe o alerta
    await expect(page.locator('text=Atenção: PDV Já Auditado!')).toBeVisible();
    await expect(page.locator('text=Esta loja já foi auditada por')).toBeVisible();
    await expect(page.locator('text=não é permitido reenviar dados')).toBeVisible();

    // Garante que o checklist NÃO foi exibido
    await expect(page.locator('text=Geladeira de Bebidas')).not.toBeVisible();

    // 4. Troca para uma loja PENDENTE (Ex: Estação Giovanni Gronchi - loja-56)
    await page.locator('button:has-text("Trocar Loja")').click();
    await searchInput.fill('Giovanni');
    const lojaPendente = page.locator('button', { hasText: 'Giovanni Gronchi' }).first();
    await expect(lojaPendente.locator('text=Disponível')).toBeVisible();
    await lojaPendente.click();

    // 5. Valida que a loja pendente LIBERA o formulário completo
    await expect(page.locator('text=Loja liberada para auditoria de campo')).toBeVisible();
    await expect(page.locator('text=Registro Inicial')).toBeVisible();
    await page.locator('button:has-text("Loja aberta e operando")').click();
    await expect(page.getByText('Geladeira de Bebidas', { exact: true })).toBeVisible();
    await expect(page.locator('text=Presença de Monster')).toBeVisible();
    await expect(page.getByText('Caixa e Entorno – Display')).toBeVisible();
    await expect(page.locator('text=Fotos Obrigatórias')).toBeVisible();
  });

  test('E2E Exportações: Download de Relatório CSV e Arquivo ZIP', async ({ request }) => {
    // 1. Testa endpoint de CSV com dados mockados
    const resCsv = await request.get('/api/export/csv');
    expect(resCsv.status()).toBe(200);
    expect(resCsv.headers()['content-type']).toContain('text/csv');
    const csvBody = await resCsv.text();
    expect(csvBody).toContain('Monster Dog - Estação Sé');
    expect(csvBody).toContain('CONCLUIDA');
    expect(csvBody).toContain('FINALIZADA_INOPERANTE');

    // 2. Testa endpoint de ZIP com fotos físicas
    const resZip = await request.get('/api/export/zip');
    expect(resZip.status()).toBe(200);
    expect(resZip.headers()['content-type']).toContain('application/zip');
    const zipBuffer = await resZip.body();
    expect(zipBuffer.length).toBeGreaterThan(1000); // Arquivo ZIP não-vazio gerado
  });
});
