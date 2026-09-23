import { test, expect } from '@playwright/test';

test.describe('PWA Auditoria PDV - E2E Tests', () => {
  test('deve carregar o app mobile, identificar pesquisador e selecionar loja', async ({ page }) => {
    await page.goto('/');

    // Verifica título e header
    await expect(page.locator('h1:has-text("PDV Conexão")')).toBeVisible();
    await expect(page.locator('text=Cliente Oculto').first()).toBeVisible();

    // Seleciona o primeiro pesquisador
    const selectPesquisador = page.locator('select');
    await expect(selectPesquisador).toBeVisible();
    await selectPesquisador.selectOption({ index: 1 });

    // Verifica badge salvo
    await expect(page.locator('text=Salvo no aparelho')).toBeVisible();

    // Autocomplete de loja
    const searchInput = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Sé');

    // Clica no resultado de Sé
    const storeItem = page.locator('text=Estação Sé').first();
    await expect(storeItem).toBeVisible();
    await storeItem.click();

    // Verifica se a loja foi selecionada
    await expect(page.locator('text=Trocar Loja')).toBeVisible();
  });

  test('deve alternar para o Painel do Coordenador e exibir métricas das 57 lojas', async ({ page }) => {
    await page.goto('/');

    // Clica na aba Coordenador
    const coordTabBtn = page.locator('button', { hasText: 'Coordenador' });
    await coordTabBtn.click();

    // Valida títulos e métricas do dashboard
    await expect(page.locator('text=Painel do Coordenador de Campo')).toBeVisible();
    await expect(page.locator('text=Progresso Geral da Operação')).toBeVisible();
    await expect(page.locator('text=Exportar Relatório Excel/CSV')).toBeVisible();
    await expect(page.locator('text=Download ZIP de Fotos')).toBeVisible();

    // Valida tabela de lojas
    await expect(page.locator('th:has-text("Loja / Estação")')).toBeVisible();
    await expect(page.locator('th:has-text("Rede")')).toBeVisible();
    await expect(page.locator('th:has-text("CNPJ")')).toBeVisible();
  });
});
