import { test, expect } from '@playwright/test';
import { prisma } from '../../src/server/db';

const NOME = 'Promotor E2E Restrito';

test.describe('E2E - Cadastro de pesquisadores pelo coordenador', () => {
  test.beforeAll(async () => {
    await prisma.pesquisador.deleteMany({ where: { nome: NOME } });
  });

  test.afterAll(async () => {
    await prisma.pesquisador.deleteMany({ where: { nome: NOME } });
    await prisma.$disconnect();
  });

  test('coordenador cadastra pesquisador com uma loja e ele só vê essa loja', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'Coordenador' }).first().click();
    await page.getByRole('tab', { name: 'Pesquisadores' }).click();

    await page.getByRole('button', { name: 'Novo pesquisador' }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.locator('input[type="text"]').first().fill(NOME);
    await dialogo.locator('input[type="tel"]').fill('(11) 97777-0000');
    await dialogo.getByRole('button', { name: 'Lojas específicas' }).click();

    // Salvar sem loja mostra o erro de validação
    await dialogo.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialogo.getByText('Selecione ao menos uma loja')).toBeVisible();

    await dialogo.getByPlaceholder('Buscar loja ou estação...').fill('Giovanni');
    await dialogo.locator('label', { hasText: 'Giovanni Gronchi' }).locator('input').check();
    await dialogo.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialogo).toHaveCount(0);
    await expect(page.getByText(NOME)).toBeVisible();
    await expect(page.getByText('1 loja: Ponto Alpha - Estação Giovanni Gronchi')).toBeVisible();

    // No app de campo, a pessoa só encontra a loja liberada
    await page.locator('button', { hasText: 'Pesquisador' }).first().click();
    await page.locator('select').first().selectOption({ label: `${NOME} — (11) 97777-0000` });
    await expect(page.getByText('1 loja liberada para você')).toBeVisible();
    const busca = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await busca.fill('Sé');
    await expect(page.getByText('Nenhum PDV encontrado')).toBeVisible();
    await busca.fill('Giovanni');
    await expect(page.locator('button', { hasText: 'Giovanni Gronchi' })).toBeVisible();
  });
});
