import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Acesso do coordenador protegido por PIN (env COORD_PIN).
 * O PIN correto gera um cookie de sessão assinado (HttpOnly, SameSite=Strict),
 * que também vale para os downloads de CSV/ZIP abertos em nova aba.
 * Sem COORD_PIN configurado as rotas ficam abertas (ambiente de desenvolvimento).
 */

const COOKIE = 'pdv_coord';
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

// Segredo aleatório por processo: um token não pode ser forjado só adivinhando o PIN.
// Reiniciar o servidor encerra as sessões (basta digitar o PIN de novo).
const SEGREDO = process.env.COORD_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const MAX_FALHAS_POR_IP = 5;
const MAX_FALHAS_GLOBAL = 50;

let falhasGlobais: number[] = [];
const falhasPorIp = new Map<string, number[]>();

export function pinConfigurado(): string | null {
  return process.env.COORD_PIN?.trim() || null;
}

const hmac = (dados: string, pin: string) =>
  crypto.createHmac('sha256', `${SEGREDO}:${pin}`).update(dados).digest('hex');

const iguais = (a: string, b: string) => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export function gerarToken(pin: string, agora = Date.now()): string {
  const expira = agora + DURACAO_SESSAO_MS;
  return `${expira}.${hmac(`coord:${expira}`, pin)}`;
}

export function tokenValido(token: string, pin: string, agora = Date.now()): boolean {
  const [expiraTxt, assinatura] = token.split('.');
  const expira = Number(expiraTxt);
  if (!expira || !assinatura || expira < agora) return false;
  return iguais(assinatura, hmac(`coord:${expira}`, pin));
}

function lerCookie(req: Request, nome: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const parte of header.split(';')) {
    const [chave, ...valor] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(valor.join('='));
  }
  return null;
}

function sessaoAtiva(req: Request): boolean {
  const pin = pinConfigurado();
  if (!pin) return true;
  const token = lerCookie(req, COOKIE);
  return !!token && tokenValido(token, pin);
}

function definirCookie(req: Request, res: Response, valor: string, maxAgeSeg: number) {
  const seguro = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(valor)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeg}${seguro ? '; Secure' : ''}`
  );
}

const recentes = (lista: number[], agora: number) => lista.filter((t) => agora - t < JANELA_TENTATIVAS_MS);

/** Middleware das rotas exclusivas do coordenador */
export function exigirCoordenador(req: Request, res: Response, next: NextFunction) {
  if (sessaoAtiva(req)) return next();
  return res.status(401).json({ error: 'Acesso do coordenador: informe o PIN', codigo: 'PIN_NECESSARIO' });
}

export function obterSessao(req: Request, res: Response) {
  return res.json({ pinConfigurado: !!pinConfigurado(), autenticado: sessaoAtiva(req) });
}

export function entrar(req: Request, res: Response) {
  const pin = pinConfigurado();
  if (!pin) return res.json({ autenticado: true });

  const agora = Date.now();
  const ip = req.ip || 'desconhecido';
  falhasGlobais = recentes(falhasGlobais, agora);
  const falhasIp = recentes(falhasPorIp.get(ip) || [], agora);

  if (falhasIp.length >= MAX_FALHAS_POR_IP || falhasGlobais.length >= MAX_FALHAS_GLOBAL) {
    return res.status(429).json({ error: 'Muitas tentativas incorretas. Aguarde 15 minutos e tente de novo.' });
  }

  const enviado = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
  if (!enviado || !iguais(enviado, pin)) {
    falhasPorIp.set(ip, [...falhasIp, agora]);
    falhasGlobais.push(agora);
    return res.status(401).json({ error: 'PIN incorreto' });
  }

  falhasPorIp.delete(ip);
  definirCookie(req, res, gerarToken(pin, agora), DURACAO_SESSAO_MS / 1000);
  return res.json({ autenticado: true });
}

export function sair(req: Request, res: Response) {
  definirCookie(req, res, '', 0);
  return res.json({ autenticado: false });
}

/** Só para testes: zera o contador de tentativas */
export function _resetarTentativas() {
  falhasGlobais = [];
  falhasPorIp.clear();
}
