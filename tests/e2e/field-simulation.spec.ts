import { test, expect, Locator, Page } from '@playwright/test';
import { CATEGORIAS_BEBIDA } from '../../src/shared/constants';
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

    // 3. Marca loja aberta e responde o checklist (nada vem pré-preenchido)
    await expect(page.locator('text=Registro Inicial')).toBeVisible();
    await page.locator('button:has-text("Loja aberta e operando")').click();

    const escolher = (pergunta: string, opcao: string, escopo: Locator | Page = page) =>
      escopo.locator(`[data-pergunta="${pergunta}"]`).getByRole('button', { name: opcao, exact: true }).click();

    // Enviar sem responder deve listar o que falta
    await page.locator('button:has-text("Finalizar Auditoria")').click();
    await expect(page.locator('text=Informe se existe geladeira de bebidas')).toBeVisible();

    const enviarFotos = async (escopo: Locator, esperadas: number) => {
      const inputs = escopo.locator('input[type="file"]');
      expect(await inputs.count()).toBe(esperadas);
      for (let i = 0; i < esperadas; i++) {
        await inputs.nth(i).setInputFiles({
          name: `audit_photo_${i + 1}.jpg`,
          mimeType: 'image/jpeg',
          buffer: TEST_IMAGE_BUFFER
        });
        // Aguarda indicador de foto carregada
        await expect(escopo.locator('text=Refazer').nth(i)).toBeVisible({ timeout: 10000 });
      }
    };

    /** Responde uma geladeira inteira dentro do card dela, com as fotos */
    const responderGeladeira = async (numero: number, posse: string, monster: 'Sim' | 'Não') => {
      const card = page.locator(`[data-geladeira="${numero}"]`);
      await card.locator('input[placeholder*="Vertical Coca"]').fill(`Geladeira ${numero} do teste`);
      await escolher('A geladeira possui identificação visual de alguma marca?', 'Coca-Cola', card);
      await escolher('A geladeira aparenta pertencer a:', posse, card);
      await escolher('Tem Monster nesta geladeira?', monster, card);
      for (const categoria of CATEGORIAS_BEBIDA) {
        const item = card.locator(`[data-categoria="${categoria}"]`);
        await escolher(categoria, 'Sim', item);
        await escolher('Tem concorrentes?', 'Não', item);
      }
      await escolher('Organização', 'Organizada', card);
      await escolher('Abastecimento', 'Cheia', card);
      await escolher('Visibilidade das marcas', 'Produtos facilmente identificáveis', card);
      await escolher('Produtos concorrentes misturados?', 'Não', card);
      // Fotos desta geladeira: visão geral, bebidas e detalhe
      await enviarFotos(card, 3);
      await expect(card.locator('text=Completa')).toBeVisible();
    };

    // §4 a §7 Geladeiras: a loja tem duas, cada uma com seu relatório
    await escolher('Existe geladeira de bebidas?', 'Sim');
    await responderGeladeira(1, 'Coca-Cola/FEMSA', 'Sim');
    await page.locator('button:has-text("Adicionar outra geladeira")').click();
    await responderGeladeira(2, 'Monster', 'Não');

    // Monster em uma geladeira já marca Monster na loja
    await expect(
      page.locator('[data-pergunta="Existe Monster na loja?"]').getByRole('button', { name: 'Sim', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');

    // §6 Marcas Coca-Cola na loja
    await page.locator('button:has-text("Fanta")').click();
    await page.locator('button:has-text("Sprite")').click();

    // §9 Caixa e entorno
    await escolher('Existe espaço livre próximo ao caixa?', 'Não');
    await escolher('Existem displays de balas, gomas ou doces?', 'Não');
    await escolher('Espaço disponível', 'Limitado');
    await escolher('Potencial para display', 'Baixo');

    // Fotos da loja: visão geral e caixa
    await enviarFotos(page.locator('[data-fotos="loja"]'), 2);

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
    await expect(page.locator('text=Geladeiras de Bebidas')).not.toBeVisible();
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
    await expect(page.locator('text=Geladeiras de Bebidas')).not.toBeVisible();
    await expect(page.locator('text=Presença de Monster')).not.toBeVisible();

    // Exige justificativa em texto
    const textareaJustificativa = page.locator('textarea[placeholder*="Loja fechada com grades"]');
    await expect(textareaJustificativa).toBeVisible();
    await textareaJustificativa.fill('Quiosque fechado com grades de metal devido a reformas no mezanino');

    // Valida que exige apenas 1 foto (visão geral / fachada)
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
