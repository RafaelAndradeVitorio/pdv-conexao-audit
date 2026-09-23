import { test, expect, Page } from '@playwright/test';
import { prisma } from '../../src/server/db';

const FOTO = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const LOJAS = ['loja-47', 'loja-48'];

async function escolherLoja(page: Page, busca: string) {
  await page.goto('/');
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]').fill(busca);
  await page.locator('button', { hasText: busca }).first().click();
  await expect(page.locator('text=Loja liberada para auditoria de campo')).toBeVisible();
}

test.describe('E2E - Campo sem sinal (rascunho e fila de envio)', () => {
  test.beforeAll(async () => {
    await prisma.foto.deleteMany({ where: { auditoria: { lojaId: { in: LOJAS } } } });
    await prisma.auditoria.deleteMany({ where: { lojaId: { in: LOJAS } } });
    await prisma.loja.updateMany({
      where: { id: { in: LOJAS } },
      data: { status: 'PENDENTE', auditadaEm: null, pesquisadorId: null }
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('sem conexão a auditoria fica no aparelho e é enviada quando o sinal volta', async ({ page, context }) => {
    await escolherLoja(page, 'Belém');
    await page.locator('button:has-text("Loja fechada")').click();
    await page.locator('textarea').first().fill('Loja fechada com grades, sem previsão de reabertura');
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'fachada.jpg', mimeType: 'image/jpeg', buffer: FOTO });
    await expect(page.locator('text=Refazer')).toBeVisible();

    await context.setOffline(true);
    await page.locator('button:has-text("Finalizar Auditoria")').click();
    await expect(page.locator('text=Auditoria salva no aparelho')).toBeVisible({ timeout: 10000 });

    const chipFila = page.locator('button[title*="aguardando envio"]');
    await expect(chipFila).toBeVisible();

    await context.setOffline(false);
    await expect(chipFila).toHaveCount(0, { timeout: 20000 });

    const loja = await prisma.loja.findUnique({ where: { id: 'loja-47' } });
    expect(loja?.status).toBe('FINALIZADA_INOPERANTE');
  });

  test('respostas e loja em andamento sobrevivem a recarregar a página', async ({ page }) => {
    await escolherLoja(page, 'Artur Alvim');
    await page.locator('button:has-text("Loja aberta e operando")').click();
    await page
      .locator('[data-pergunta="Existe geladeira de bebidas?"]')
      .getByRole('button', { name: 'Não', exact: true })
      .click();
    await page.waitForTimeout(800); // rascunho é salvo 400ms após a última alteração

    await page.reload();
    await expect(page.locator('text=Rascunho restaurado')).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[data-pergunta="Existe geladeira de bebidas?"]').getByRole('button', { name: 'Não', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
