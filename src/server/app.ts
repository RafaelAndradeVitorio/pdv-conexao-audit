import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/api.routes';
import { storageService } from './storage/storage.service';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Servir arquivos estáticos de uploads com fallback inteligente para fotos mockadas/arquivadas
app.use('/uploads', express.static(storageService.getBaseDir()));
app.get('/uploads/*', (req: Request, res: Response) => {
  const relPath = req.path.replace(/^\/uploads\/?/, '');
  const filePath = storageService.getFilePath(relPath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Fallback: Retorna um SVG de alta definição representando o registro fotográfico
  const fileName = path.basename(relPath);
  const cleanName = decodeURIComponent(fileName)
    .replace(/^foto_/, '')
    .replace(/_\d+\.webp$/, '')
    .replace(/_/g, ' ')
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
    <rect width="800" height="600" fill="#0B0F19"/>
    <rect x="20" y="20" width="760" height="560" rx="28" stroke="#1E293B" stroke-width="2" fill="#131B2B"/>
    <circle cx="400" cy="240" r="64" fill="#182234" stroke="#2A3854" stroke-width="2"/>
    <path d="M370 230h60l12 18h20c6.6 0 12 5.4 12 12v50c0 6.6-5.4 12-12 12H348c-6.6 0-12-5.4-12-12v-50c0-6.6 5.4-12 12-12h22l12-18z" stroke="#60A5FA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="400" cy="272" r="22" stroke="#60A5FA" stroke-width="4" fill="none"/>
    <text x="400" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#F8FAFC" text-anchor="middle">${cleanName || 'REGISTRO FOTOGRÁFICO'}</text>
    <rect x="290" y="390" width="220" height="30" rx="15" fill="#1E293B"/>
    <text x="400" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#93C5FD" text-anchor="middle">COMPRESSÃO WEBP ATIVA</text>
    <text x="400" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748B" text-anchor="middle">Auditoria de Campo RMSP • 57 Lojas</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'PDV Conexao Audit API',
    time: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api', apiRouter);

// Servir frontend compilado em produção (SPA Fallback)
const clientDist = path.resolve(process.cwd(), './dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  });
}

// Handler de rota 404 para API
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Handler global de erros
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado na API:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  res.status(status).json({ error: message });
});
