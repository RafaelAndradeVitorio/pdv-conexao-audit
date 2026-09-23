import { describe, it, expect } from 'vitest';
import { compressAuditPhoto } from '../../src/client/utils/compression';

describe('Image Compression Client-Side Tests (SDET Suite)', () => {
  it('deve simular arquivo JPEG/PNG de 10 MB e garantir redução para menos de 600 KB com formato WebP válido', async () => {
    // Simula arquivo grande de câmera moderna (~10MB)
    const tenMb = 10 * 1024 * 1024;
    const mockBlob = new Blob(['A'.repeat(tenMb)], { type: 'image/jpeg' });
    const mockFile = new File([mockBlob], 'foto_fachada_alta_resolucao.jpg', { type: 'image/jpeg' });

    const result = await compressAuditPhoto(mockFile);

    expect(result).toBeDefined();
    // Validar se o blob resultante tem menos de 600 KB
    expect(result.compressedSizeKb).toBeLessThan(600);
    expect(result.originalSizeKb).toBeGreaterThanOrEqual(10000);
    expect(result.reductionPercentage).toBeGreaterThanOrEqual(90);
    // Validar se o formato gerado é WebP
    expect(result.base64).toMatch(/^data:image\/webp;base64,/);
    expect(result.compressedFile.type).toBe('image/webp');
  });

  it('deve manter a integridade ao processar PNG de alta resolução', async () => {
    const eightMb = 8 * 1024 * 1024;
    const mockBlob = new Blob(['B'.repeat(eightMb)], { type: 'image/png' });
    const mockFile = new File([mockBlob], 'geladeira_concorrentes.png', { type: 'image/png' });

    const result = await compressAuditPhoto(mockFile);

    expect(result.compressedSizeKb).toBeLessThan(600);
    expect(result.base64).toContain('data:image/webp;base64,');
  });
});
