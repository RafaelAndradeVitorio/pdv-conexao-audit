import { test, expect } from '@playwright/test';
import { prisma } from '../../src/server/db';

const TEST_IMAGE_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

test.describe('E2E Mobile - Simulação de Campo (QA / SDET Suite)', () => {
  test.beforeAll(async () => {
    // Garante que loja-45 e loja-46 estejam PENDENTES para o teste
    await prisma.foto.deleteMany({
      where: { auditoria: { lojaId: { in: ['loja-45', 'loja-46'] } } }
    });
    await prisma.auditoria.deleteMany({
      where: { lojaId: { in: ['loja-45', 'loja-46'] } }
    });
    await prisma.loja.updateMany({
      where: { id: { in: ['loja-45', 'loja-46'] } },
      data: { status: 'PENDENTE', auditadaEm: null, pesquisadorId: null }
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Cenário 1: Auditoria Completa com Sucesso (Mobile Fast 3G Simulation)', async ({
    page,
    context
  }) => {
    // Simula condições de rede móvel (Fast 3G: 1.5 Mbps down, 750 kbps up, 40ms latência)
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 40
    });

    await page.goto('/');

    // 1. Identificação do Pesquisador
    const selectPesquisador = page.locator('select').first();
    await expect(selectPesquisador).toBeVisible();
    await selectPesquisador.selectOption({ label: 'Ana Silva — (11) 98765-4321' });
    await expect(page.locator('text=Salvo no aparelho')).toBeVisible();

    // 2. Digita os primeiros 4 dígitos de um CNPJ pendente (1234)
    const searchInput = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await searchInput.fill('1234');

    // Seleciona a loja-45 no autocomplete
    const storeOption = page.locator('button', { hasText: 'Jardim São Paulo' }).first();
    await expect(storeOption).toBeVisible();
    await storeOption.click();

    // Valida loja liberada
    await expect(page.locator('text=Loja liberada para auditoria de campo')).toBeVisible();

    // 3. Marca loja aberta e preenche checklist
    await expect(page.locator('text=Status de Entrada no PDV')).toBeVisible();
    await page.locator('button:has-text("Loja aberta e operando")').click();

    // Checklist Geladeira
    await expect(page.locator('text=Geladeira de Bebidas')).toBeVisible();

    // Checklist Monster & Marcas
    await expect(page.locator('text=Presença Monster & Coca-Cola')).toBeVisible();
    await page.locator('button:has-text("Fanta")').click();
    await page.locator('button:has-text("Sprite")').click();

    // Área do Caixa
    await expect(page.locator('text=Área do Caixa & Display "Coca-Cola Vai Até Você"')).toBeVisible();

    // 4. Upload das 6 fotos obrigatórias
    const fileInputs = page.locator('input[type="file"]');
    const totalFotos = await fileInputs.count();
    expect(totalFotos).toBe(6);

    for (let i = 0; i < totalFotos; i++) {
      await fileInputs.nth(i).setInputFiles({
        name: `audit_photo_${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        buffer: TEST_IMAGE_BUFFER
      });
      // Aguarda indicador de foto carregada
      await expect(page.locator('text=Refazer').nth(i)).toBeVisible({ timeout: 10000 });
    }

    // 5. Clica em "Finalizar Auditoria"
    const submitBtn = page.locator('button:has-text("Finalizar Auditoria")');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 6. Verifica tela de confirmação e reset do formulário
    await expect(page.locator('text=Auditoria Enviada!')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Iniciar Próxima Loja')).toBeVisible();

    // Formulário foi resetado para nova busca
    await expect(page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]')).toBeVisible();
  });

  test('Cenário 2: Tentativa de Acessar Loja Já Concluída (Trava de Duplicidade)', async ({
    page
  }) => {
    await page.goto('/');

    // Tenta selecionar a loja-45 recém-concluída
    const searchInput = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await searchInput.fill('Jardim São Paulo');

    const lojaConcluida = page.locator('button', { hasText: 'Jardim São Paulo' }).first();
    await expect(lojaConcluida).toBeVisible();
    await expect(lojaConcluida.locator('text=Já Auditada')).toBeVisible();
    await lojaConcluida.click();

    // Verifica aviso de bloqueio e formulário travado
    await expect(page.locator('text=Atenção: PDV Já Auditado!')).toBeVisible();
    await expect(page.locator('text=Esta loja já foi auditada por')).toBeVisible();
    await expect(page.locator('text=não é permitido reenviar dados')).toBeVisible();

    // Garante que o checklist NÃO foi exibido
    await expect(page.locator('text=Geladeira de Bebidas')).not.toBeVisible();
  });

  test('Cenário 3: Loja Fechada / Inoperante (Fluxo Simplificado)', async ({ page }) => {
    await page.goto('/');

    // 1. Identificação do Pesquisador
    const selectPesquisador = page.locator('select').first();
    await selectPesquisador.selectOption({ index: 1 });
    await expect(page.locator('text=Salvo no aparelho')).toBeVisible();

    // 2. Seleciona outra loja pendente (loja-46: Bresser-Mooca)
    const searchInput = page.locator('input[placeholder*="Digite o CNPJ, Nome da Loja"]');
    await searchInput.fill('Bresser');

    const lojaPendente = page.locator('button', { hasText: 'Bresser-Mooca' }).first();
    await expect(lojaPendente).toBeVisible();
    await lojaPendente.click();

    // Marca como "Loja fechada"
    await page.locator('button:has-text("Loja fechada")').click();

    // Valida que seções de geladeira e bebidas ficam OCULTAS
    await expect(page.locator('text=Geladeira de Bebidas')).not.toBeVisible();
    await expect(page.locator('text=Presença Monster & Coca-Cola')).not.toBeVisible();

    // Exige justificativa em texto
    const textareaJustificativa = page.locator('textarea[placeholder*="Loja fechada por grades"]');
    await expect(textareaJustificativa).toBeVisible();
    await textareaJustificativa.fill('Quiosque fechado com grades de metal devido a reformas no mezanino');

    // Valida que exige apenas 1 foto (Foto 01 Fachada)
    const fileInputs = page.locator('input[type="file"]');
    expect(await fileInputs.count()).toBe(1);

    await fileInputs.first().setInputFiles({
      name: 'fachada_fechada.jpg',
      mimeType: 'image/jpeg',
      buffer: TEST_IMAGE_BUFFER
    });

    await expect(page.locator('text=Refazer')).toBeVisible();

    // Envia a auditoria inoperante
    const submitBtn = page.locator('button:has-text("Finalizar Auditoria")');
    await submitBtn.click();

    // Valida feedback de sucesso
    await expect(page.locator('text=Auditoria Enviada!')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=FINALIZADA_INOPERANTE')).toBeVisible();
  });
});
