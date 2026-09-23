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

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(storageService.getBaseDir()));

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
