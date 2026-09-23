import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { bootstrapDatabase } from './db/bootstrap';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  await bootstrapDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 PDV Auditoria API rodando na porta ${PORT}`);
    console.log(`   URL Local: http://localhost:${PORT}`);
    console.log(`   Healthcheck: http://localhost:${PORT}/health`);
    console.log(`=========================================`);
  });
}

start().catch((err) => {
  console.error('Falha crítica ao iniciar servidor:', err);
  process.exit(1);
});
