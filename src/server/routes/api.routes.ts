import { Router } from 'express';
import multer from 'multer';
import { listarPesquisadores } from '../controllers/pesquisadores.controller';
import { listarLojas, obterLojaPorId, resetarLoja } from '../controllers/lojas.controller';
import {
  submeterAuditoria,
  uploadFoto,
  obterDashboard,
  obterResultados,
  obterAuditoriaPorId
} from '../controllers/auditorias.controller';
import { exportarCsv, exportarZip } from '../controllers/exports.controller';
import { obterStatusDrive, sincronizarFotosDrive } from '../controllers/drive.controller';
import { exigirCoordenador, obterSessao, entrar, sair } from '../auth/coordenador';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB máximo
  }
});

export const apiRouter = Router();

// Acesso do coordenador (PIN)
apiRouter.get('/coord/sessao', obterSessao);
apiRouter.post('/coord/entrar', entrar);
apiRouter.post('/coord/sair', sair);

// Pesquisadores
apiRouter.get('/pesquisadores', listarPesquisadores);

// Lojas (com busca, filtros e validação anti-duplicação)
apiRouter.get('/lojas', listarLojas);
apiRouter.get('/lojas/:id', exigirCoordenador, obterLojaPorId);
apiRouter.post('/lojas/:id/reset', exigirCoordenador, resetarLoja);

// Auditorias
apiRouter.post('/auditorias', submeterAuditoria);
apiRouter.post('/auditorias/upload-foto', upload.single('foto'), uploadFoto);
apiRouter.get('/auditorias/dashboard', exigirCoordenador, obterDashboard);
apiRouter.get('/auditorias/resultados', exigirCoordenador, obterResultados);
apiRouter.get('/auditorias/:id', exigirCoordenador, obterAuditoriaPorId);

// Exportações do Coordenador
apiRouter.get('/export/csv', exigirCoordenador, exportarCsv);
apiRouter.get('/export/zip', exigirCoordenador, exportarZip);

// Google Drive Integration
apiRouter.get('/drive/status', exigirCoordenador, obterStatusDrive);
apiRouter.post('/drive/sync', exigirCoordenador, sincronizarFotosDrive);
