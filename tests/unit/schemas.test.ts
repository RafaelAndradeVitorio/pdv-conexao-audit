import { describe, it, expect } from 'vitest';
import {
  AuditoriaSubmissionSchema,
  LojaSchema,
  CnpjInputSchema,
  UploadFotoSchema
} from '../../src/shared/schemas';
import {
  STATUS_ENTRADA,
  CATEGORIAS_BEBIDA,
  NAO_IDENTIFICADO,
  fotosObrigatorias,
  nomeArquivoFoto,
  lerTipoFoto
} from '../../src/shared/constants';

describe('Zod Schemas Unit Tests (QA / SDET Suite)', () => {
  describe('AuditoriaSubmissionSchema', () => {
    const foto = (tipo: string) => ({ tipo, url: `/uploads/${tipo}.webp`, tamanhoBytes: 300000 });

    const mapaCompleto = () =>
      CATEGORIAS_BEBIDA.map((categoria) => ({
        categoria,
        tem: categoria !== 'Chás',
        marcas: categoria === 'Refrigerantes' ? 'Coca-Cola, Fanta' : '',
        concorrentes: categoria === 'Refrigerantes' ? true : categoria === 'Chás' ? null : false
      }));

    const geladeiraCompleta = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      identificacao: 'Vertical ao lado do caixa',
      marcaVisual: 'Coca-Cola',
      posse: 'Coca-Cola/FEMSA',
      monsterPresente: true,
      mapaBebidas: mapaCompleto(),
      organizacao: 'Organizada',
      abastecimento: 'Cheia',
      visibilidade: 'Produtos facilmente identificáveis',
      concorrentesMisturados: true,
      concorrentesDetalhes: 'Pepsi na 2ª prateleira',
      ...extra
    });

    const fotosGeladeira = (n: number, concorrentes = true) =>
      ['foto_geladeira', 'foto_marcas', ...(concorrentes ? ['foto_concorrentes'] : []), 'foto_detalhe'].map((t) =>
        foto(`${t}:${n}`)
      );

    const fotosLoja = () => ['foto_fachada', 'foto_caixa', 'foto_display', 'foto_display_aproximada'].map(foto);

    const lojaAbertaCompleta = () => ({
      lojaId: 'loja-01',
      pesquisadorId: 'pesq-01',
      statusEntrada: STATUS_ENTRADA.ABERTA,
      existeGeladeira: true,
      geladeiras: [geladeiraCompleta()],
      monsterPresente: true,
      marcasCocaPresentes: ['Coca-Cola', 'Fanta', 'Monster'],
      espacoLivreCaixa: true,
      espacoLadoTamanho: 'Lado direito, 50cm',
      boaVisibilidadeCaixa: true,
      espacoDisponivel: 'Bom',
      outrosDisplaysImpulso: true,
      displaysImpulsoMarcas: 'Fini, Trident',
      displaysImpulsoProximo: true,
      potencialDisplay: 'Alto',
      descricaoOportunidade: 'Ótima visibilidade junto ao caixa',
      fotos: [...fotosLoja(), ...fotosGeladeira(1)]
    });

    const mensagens = (data: unknown) => {
      const result = AuditoriaSubmissionSchema.safeParse(data);
      return result.success ? [] : result.error.issues.map((i) => i.message);
    };

    it('deve validar com sucesso uma auditoria completa de loja aberta', () => {
      expect(mensagens(lojaAbertaCompleta())).toEqual([]);
    });

    it('deve falhar se loja aberta não tiver as fotos obrigatórias', () => {
      const msgs = mensagens({ ...lojaAbertaCompleta(), fotos: [foto('foto_fachada')] });
      expect(msgs).toContain('Foto obrigatória ausente: Área do caixa – Oportunidade Display');
      expect(msgs).toContain('Geladeira 1: foto obrigatória ausente – Geladeira – visão geral');
    });

    it('não deve aceitar checklist sem respostas (nada pode vir pré-preenchido)', () => {
      const msgs = mensagens({
        lojaId: 'loja-01',
        pesquisadorId: 'pesq-01',
        statusEntrada: STATUS_ENTRADA.ABERTA,
        existeGeladeira: null,
        monsterPresente: null,
        espacoLivreCaixa: null,
        fotos: [foto('foto_fachada'), foto('foto_caixa')]
      });
      expect(msgs).toContain('Informe se existe geladeira de bebidas');
      expect(msgs).toContain('Informe se existe Monster na loja');
      expect(msgs).toContain('Informe se existe espaço livre próximo ao caixa');
      expect(msgs.some((m) => m.includes('potencial'))).toBe(true);
    });

    it('loja aberta sem geladeira não exige fotos nem perguntas da geladeira', () => {
      const semGeladeira = {
        lojaId: 'loja-03',
        pesquisadorId: 'pesq-01',
        statusEntrada: STATUS_ENTRADA.ABERTA,
        existeGeladeira: false,
        monsterPresente: false,
        espacoLivreCaixa: false,
        espacoDisponivel: 'Insuficiente',
        outrosDisplaysImpulso: false,
        potencialDisplay: 'Baixo',
        fotos: [foto('foto_fachada'), foto('foto_caixa')]
      };
      expect(mensagens(semGeladeira)).toEqual([]);
    });

    it('com geladeira, exige ao menos uma geladeira registrada', () => {
      expect(mensagens({ ...lojaAbertaCompleta(), geladeiras: [] })).toContain('Registre ao menos uma geladeira');
    });

    it('foto de concorrentes só é exigida na geladeira com concorrentes misturados', () => {
      const semConcorrentes = {
        ...lojaAbertaCompleta(),
        geladeiras: [geladeiraCompleta({ concorrentesMisturados: false, concorrentesDetalhes: null })],
        fotos: [...fotosLoja(), ...fotosGeladeira(1, false)]
      };
      expect(mensagens(semConcorrentes)).toEqual([]);

      const comConcorrentesSemFoto = { ...lojaAbertaCompleta(), fotos: semConcorrentes.fotos };
      expect(mensagens(comConcorrentesSemFoto)).toContain('Geladeira 1: foto obrigatória ausente – Concorrentes');
    });

    it('deve exigir o mapa de bebidas completo em cada geladeira', () => {
      const mapa = mapaCompleto().map((m) => (m.categoria === 'Água' ? { ...m, tem: null } : m));
      expect(mensagens({ ...lojaAbertaCompleta(), geladeiras: [geladeiraCompleta({ mapaBebidas: mapa })] })).toContain(
        'Geladeira 1: mapa de bebidas: informe se tem Água'
      );
    });

    it('deve aceitar "Não foi possível identificar" na identificação e posse da geladeira', () => {
      const data = {
        ...lojaAbertaCompleta(),
        geladeiras: [geladeiraCompleta({ marcaVisual: NAO_IDENTIFICADO, posse: NAO_IDENTIFICADO })]
      };
      expect(mensagens(data)).toEqual([]);
    });

    describe('várias geladeiras na mesma loja', () => {
      const tresGeladeiras = () => ({
        ...lojaAbertaCompleta(),
        geladeiras: [
          geladeiraCompleta(),
          geladeiraCompleta({ identificacao: 'Horizontal', posse: 'Monster', concorrentesMisturados: false, concorrentesDetalhes: null }),
          geladeiraCompleta({ identificacao: null, monsterPresente: false })
        ],
        fotos: [...fotosLoja(), ...fotosGeladeira(1), ...fotosGeladeira(2, false), ...fotosGeladeira(3)]
      });

      it('valida uma loja com 3 geladeiras completas', () => {
        expect(mensagens(tresGeladeiras())).toEqual([]);
      });

      it('aponta a pendência só na geladeira que falta responder', () => {
        const data = tresGeladeiras();
        data.geladeiras[1] = { ...data.geladeiras[1], abastecimento: null };
        expect(mensagens(data)).toEqual(['Geladeira 2: avalie o abastecimento']);
      });

      it('exige as fotos de cada geladeira separadamente', () => {
        const data = tresGeladeiras();
        data.fotos = data.fotos.filter((f) => f.tipo !== 'foto_marcas:3');
        expect(mensagens(data)).toEqual(['Geladeira 3: foto obrigatória ausente – Bebidas e marcas']);
      });

      it('Monster em uma geladeira exige Monster na loja', () => {
        expect(mensagens({ ...tresGeladeiras(), monsterPresente: false })).toContain(
          'Há Monster em uma geladeira: marque que existe Monster na loja'
        );
      });
    });

    it('aceita o envio no formato antigo (uma geladeira em campos soltos) como Geladeira 1', () => {
      const antigo = {
        lojaId: 'loja-01',
        pesquisadorId: 'pesq-01',
        statusEntrada: STATUS_ENTRADA.ABERTA,
        existeGeladeira: true,
        marcaVisualGeladeira: 'Coca-Cola',
        posseGeladeira: 'Coca-Cola/FEMSA',
        monsterPresente: true,
        monsterNaGeladeira: true,
        mapaBebidas: mapaCompleto(),
        marcasCocaPresentes: ['Coca-Cola'],
        organizacaoGeladeira: 'Organizada',
        abastecimentoGeladeira: 'Cheia',
        visibilidadeMarcas: 'Produtos facilmente identificáveis',
        concorrentesMisturados: false,
        espacoLivreCaixa: false,
        espacoDisponivel: 'Limitado',
        outrosDisplaysImpulso: false,
        potencialDisplay: 'Baixo',
        // Fotos antigas, sem o número da geladeira
        fotos: ['foto_fachada', 'foto_caixa', 'foto_geladeira', 'foto_marcas', 'foto_detalhe'].map(foto)
      };
      const result = AuditoriaSubmissionSchema.safeParse(antigo);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.geladeiras).toHaveLength(1);
        expect(result.data.geladeiras[0]).toMatchObject({ posse: 'Coca-Cola/FEMSA', monsterPresente: true, abastecimento: 'Cheia' });
      }
    });

    it('deve validar com sucesso loja inoperante com justificativa e foto de visão geral', () => {
      const inoperanteData = {
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'Loja com tapumes devido a reformas na estação',
        fotos: [foto('foto_fachada')]
      };
      expect(mensagens(inoperanteData)).toEqual([]);
    });

    it('deve aceitar status "Outro" com descrição da situação', () => {
      const outro = {
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.OUTRO,
        justificativaInoperante: 'Loja virou quiosque de outra marca',
        fotos: [foto('foto_fachada')]
      };
      expect(mensagens(outro)).toEqual([]);
    });

    it('deve falhar para loja inoperante se justificativa for vazia ou curta', () => {
      const msgs = mensagens({
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'abc',
        fotos: [foto('foto_fachada')]
      });
      expect(msgs[0]).toContain('Descreva a situação da loja');
    });

    it('deve falhar para loja inoperante se faltar a foto de visão geral', () => {
      const msgs = mensagens({
        lojaId: 'loja-02',
        pesquisadorId: 'pesq-02',
        statusEntrada: STATUS_ENTRADA.FECHADA,
        justificativaInoperante: 'Quiosque desativado permanentemente',
        fotos: []
      });
      expect(msgs).toContain('Foto obrigatória ausente: Visão geral da loja');
    });
  });

  describe('Fotos por geladeira', () => {
    it('fotosObrigatorias numera as fotos de cada geladeira', () => {
      const tipos = fotosObrigatorias({
        inoperante: false,
        existeGeladeira: true,
        geladeiras: [{ concorrentesMisturados: false }, { concorrentesMisturados: true }],
        espacoLivreCaixa: false
      });
      expect(tipos).toEqual([
        'foto_fachada',
        'foto_caixa',
        'foto_geladeira:1',
        'foto_marcas:1',
        'foto_detalhe:1',
        'foto_geladeira:2',
        'foto_marcas:2',
        'foto_concorrentes:2',
        'foto_detalhe:2'
      ]);
    });

    it('fotos antigas sem número são da geladeira 1 e mantêm o nome do arquivo', () => {
      expect(lerTipoFoto('foto_geladeira')).toEqual({ base: 'foto_geladeira', geladeira: 1 });
      expect(lerTipoFoto('foto_caixa')).toEqual({ base: 'foto_caixa', geladeira: null });
      expect(nomeArquivoFoto('foto_geladeira')).toBe('02 - Geladeira');
      expect(nomeArquivoFoto('foto_geladeira:2')).toBe('02 - Geladeira - G2');
      expect(nomeArquivoFoto('foto_caixa')).toBe('05 - Area do caixa');
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
