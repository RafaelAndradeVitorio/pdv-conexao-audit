import { describe, it, expect } from 'vitest';
import {
  AuditoriaSubmissionSchema,
  LojaSchema,
  CnpjInputSchema,
  UploadFotoSchema
} from '../../src/shared/schemas';
import { STATUS_ENTRADA } from '../../src/shared/constants';

describe('Zod Schemas Unit Tests (QA / SDET Suite)', () => {
  describe('AuditoriaSubmissionSchema', () => {
    it('deve validar com sucesso uma auditoria completa de loja aberta com 6 fotos', () => {
      const validData = {
        lojaId: 'loja-01',
        pesquisadorId: 'pesq-01',
        statusEntrada: STATUS_ENTRADA.ABERTA,
        existeGeladeira: true,
        marcaVisualGeladeira: 'Coca-Cola',
        posseGeladeira: 'FEMSA',
        organizacaoGeladeira: 'Cheia',
        monsterPresente: true,
        monsterNaGeladeira: true,
        marcasCocaPresentes: ['Coca-Cola', 'Fanta', 'Monster'],
        concorrentesMisturados: false,
        espacoLivreCaixa: true,
        espacoLadoTamanho: 'Lado direito, 50cm',
        outrosDisplaysImpulso: false,
        potencialDisplay: 'Alto',
        descricaoOportunidade: 'Ótima visibilidade junto ao caixa',
        fotos: [
          { tipo: 'foto_fachada', url: '/uploads/foto_fachada.webp', tamanhoBytes: 300000 },
          { tipo: 'foto_geladeira', url: '/uploads/foto_geladeira.webp', tamanhoBytes: 350000 },
          { tipo: 'foto_marcas', url: '/uploads/foto_marcas.webp', tamanhoBytes: 320000 },
          { tipo: 'foto_concorrentes', url: '/uploads/foto_concorrentes.webp', tamanhoBytes: 280000 },
          { tipo: 'foto_caixa', url: '/uploads/foto_caixa.webp', tamanhoBytes: 310000 },
          { tipo: 'foto_display', url: '/uploads/foto_display.webp', tamanhoBytes: 290000 }
        ]
      };

      const result = AuditoriaSubmissionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve falhar se loja aberta não tiver as 6 fotos obrigatórias', () => {
      const invalidData = {
        lojaId: 'loja-01',
        pesquisadorId: 'pesq-01',
        statusEntrada: STATUS_ENTRADA.ABERTA,
        existeGeladeira: true,
        marcaVisualGeladeira: 'Coca-Cola',
        posseGeladeira: 'FEMSA',
        organizacaoGeladeira: 'Cheia',
        monsterPresente: true,
        monsterNaGeladeira: true,
        marcasCocaPresentes: ['Coca-Cola'],
        concorrentesMisturados: false,
        espacoLivreCaixa: true,
        potencialDisplay: 'Alto',
        fotos: [
          { tipo: 'foto_fachada', url: '/uploads/foto_fachada.webp' }
          // faltam 5 fotos
        ]
      };

      const result = AuditoriaSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        expect(messages.some(m => m.includes('Foto obrigatória ausente'))).toBe(true);
      }
    });

    it('deve validar com sucesso loja inoperante com justificativa e Foto 01 (Fachada)', () => {
      const inoperanteData = {
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'Loja com tapumes devido a reformas na estação',
        fotos: [
          { tipo: 'foto_fachada', url: '/uploads/foto_fachada.webp', tamanhoBytes: 300000 }
        ]
      };

      const result = AuditoriaSubmissionSchema.safeParse(inoperanteData);
      expect(result.success).toBe(true);
    });

    it('deve falhar para loja inoperante se justificativa for vazia ou curta', () => {
      const invalidInoperante = {
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'abc', // menor que 5 caracteres
        fotos: [
          { tipo: 'foto_fachada', url: '/uploads/foto_fachada.webp' }
        ]
      };

      const result = AuditoriaSubmissionSchema.safeParse(invalidInoperante);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('informe uma justificativa detalhada');
      }
    });

    it('deve falhar para loja inoperante se faltar Foto 01 Fachada', () => {
      const invalidInoperante = {
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'Quiosque desativado permanentemente',
        fotos: []
      };

      const result = AuditoriaSubmissionSchema.safeParse(invalidInoperante);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Foto 01 (Fachada) é obrigatória');
      }
    });
  });

  describe('UploadFotoSchema - Validação de Upload de Fotos', () => {
    it('deve rejeitar payload de foto sem CNPJ com mensagem clara de erro 400', () => {
      const invalidUpload = {
        tipo: 'foto_fachada',
        base64: 'data:image/webp;base64,sample'
      };

      const result = UploadFotoSchema.safeParse(invalidUpload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('CNPJ é obrigatório');
      }
    });
  });

  describe('CnpjInputSchema - Formatos com e sem pontuação', () => {
    it('deve aceitar CNPJ formatado com máscara clássica (XX.XXX.XXX/XXXX-XX)', () => {
      const result = CnpjInputSchema.safeParse('12.345.678/0001-01');
      expect(result.success).toBe(true);
    });

    it('deve aceitar CNPJ limpo somente com os 14 dígitos numéricos', () => {
      const result = CnpjInputSchema.safeParse('12345678000101');
      expect(result.success).toBe(true);
    });

    it('deve rejeitar CNPJ incompleto ou inválido', () => {
      const result = CnpjInputSchema.safeParse('12.345.678');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('14 dígitos');
      }
    });
  });

  describe('LojaSchema', () => {
    it('deve rejeitar CNPJ sem exatamente 14 dígitos numéricos', () => {
      const invalidLoja = {
        id: 'loja-99',
        rede: 'Monster Dog',
        nome: 'Loja Teste',
        endereco: 'Rua Teste, 123',
        cnpj: '123',
        cnpjFormatado: '12.345.678/0001-00',
        status: 'PENDENTE'
      };

      const result = LojaSchema.safeParse(invalidLoja);
      expect(result.success).toBe(false);
    });
  });
});
