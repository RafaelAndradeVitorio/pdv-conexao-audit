import { Router } from 'express';
import multer from 'multer';
import { listarPesquisadores } from '../controllers/pesquisadores.controller';
import { listarLojas, obterLojaPorId } from '../controllers/lojas.controller';
import {
  submeterAuditoria,
  uploadFoto,
  obterDashboard,
  obterAuditoriaPorId
} from '../controllers/auditorias.controller';
import { exportarCsv, exportarZip } from '../controllers/exports.controller';
import { obterStatusDrive, sincronizarFotosDrive } from '../controllers/drive.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB máximo
  }
});

export const apiRouter = Router();

// Pesquisadores
apiRouter.get('/pesquisadores', listarPesquisadores);

// Lojas (com busca, filtros e validação anti-duplicação)
apiRouter.get('/lojas', listarLojas);
apiRouter.get('/lojas/:id', obterLojaPorId);

// Auditorias
apiRouter.post('/auditorias', submeterAuditoria);
apiRouter.post('/auditorias/upload-foto', upload.single('foto'), uploadFoto);
apiRouter.get('/auditorias/dashboard', obterDashboard);
apiRouter.get('/auditorias/:id', obterAuditoriaPorId);

// Exportações do Coordenador
apiRouter.get('/export/csv', exportarCsv);
apiRouter.get('/export/zip', exportarZip);

// Google Drive Integration
apiRouter.get('/drive/status', obterStatusDrive);
apiRouter.post('/drive/sync', sincronizarFotosDrive);
