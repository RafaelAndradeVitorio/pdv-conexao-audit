import { describe, it, expect, vi } from 'vitest';
import { ApiEnvio, EnvioPendente, ErroEnvio, enviarUm } from '../../src/client/utils/filaEnvio';

const novoEnvio = (): EnvioPendente => ({
  lojaId: 'loja-01',
  lojaNome: 'Loja 01',
  cnpj: '12345678000101',
  pesquisadorId: 'pesq-01',
  payload: { lojaId: 'loja-01', pesquisadorId: 'pesq-01', statusEntrada: 'Loja fechada' },
  fotos: [
    { tipo: 'foto_fachada', base64: 'data:image/webp;base64,AAA', tamanhoBytes: 1000 },
    { tipo: 'foto_caixa', base64: 'data:image/webp;base64,BBB', tamanhoBytes: 1000 }
  ],
  criadoEm: '2026-09-23T10:00:00.000Z',
  tentativas: 0,
  situacao: 'aguardando'
});

const apiOk = (): ApiEnvio => ({
  uploadFoto: vi.fn(async ({ tipo }) => ({ url: `/uploads/x/${tipo}.webp`, tamanhoBytes: 900 })),
  submeter: vi.fn(async () => undefined)
});

describe('Fila de envio offline', () => {
  it('sobe as fotos e envia o formulário com as URLs recebidas', async () => {
    const api = apiOk();
    const r = await enviarUm(novoEnvio(), api);
    expect(r).toEqual({ resultado: 'enviado' });
    expect(api.uploadFoto).toHaveBeenCalledTimes(2);
    const corpo = (api.submeter as any).mock.calls[0][0];
    expect(corpo.fotos.map((f: any) => f.url)).toEqual(['/uploads/x/foto_fachada.webp', '/uploads/x/foto_caixa.webp']);
    expect(corpo.statusEntrada).toBe('Loja fechada');
  });

  it('sem conexão: guarda o progresso e pede nova tentativa sem reenviar fotos já enviadas', async () => {
    const envio = novoEnvio();
    const salvar = vi.fn(async () => undefined);
    const api = apiOk();
    (api.uploadFoto as any).mockImplementationOnce(async () => ({ url: '/uploads/x/1.webp', tamanhoBytes: 900 }));
    (api.uploadFoto as any).mockImplementationOnce(async () => {
      throw new ErroEnvio(0, 'Sem conexão com o servidor');
    });

    const r1 = await enviarUm(envio, api, salvar);
    expect(r1).toEqual({ resultado: 'tentar-depois', mensagem: 'Sem conexão com o servidor' });
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(envio.fotos[0].url).toBe('/uploads/x/1.webp');

    const api2 = apiOk();
    const r2 = await enviarUm(envio, api2, salvar);
    expect(r2).toEqual({ resultado: 'enviado' });
    expect(api2.uploadFoto).toHaveBeenCalledTimes(1); // só a foto que faltava
  });

  it('erro 5xx do servidor também é temporário', async () => {
    const api = apiOk();
    (api.submeter as any).mockRejectedValueOnce(new ErroEnvio(503, 'Serviço indisponível'));
    expect((await enviarUm(novoEnvio(), api)).resultado).toBe('tentar-depois');
  });

  it('409 da mesma pessoa conta como enviado (a resposta anterior se perdeu)', async () => {
    const api = apiOk();
    (api.submeter as any).mockRejectedValueOnce(
      new ErroEnvio(409, 'Esta loja já foi auditada', { pesquisadorId: 'pesq-01' })
    );
    expect(await enviarUm(novoEnvio(), api)).toEqual({ resultado: 'enviado' });
  });

  it('409 de outro pesquisador e erro de validação precisam de ação', async () => {
    const api = apiOk();
    (api.submeter as any).mockRejectedValueOnce(
      new ErroEnvio(409, 'Esta loja já foi auditada por Bruno', { pesquisadorId: 'pesq-02' })
    );
    expect(await enviarUm(novoEnvio(), api)).toEqual({
      resultado: 'erro',
      mensagem: 'Esta loja já foi auditada por Bruno'
    });

    const api2 = apiOk();
    (api2.submeter as any).mockRejectedValueOnce(new ErroEnvio(400, 'Informe se existe geladeira de bebidas'));
    expect((await enviarUm(novoEnvio(), api2)).resultado).toBe('erro');
  });
});
