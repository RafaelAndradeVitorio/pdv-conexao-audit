import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  fotosObrigatorias,
  MARCA_VISUAL_GELADEIRA,
  POSSE_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  ABASTECIMENTO_GELADEIRA,
  VISIBILIDADE_MARCAS,
  ESPACO_DISPONIVEL,
  CATEGORIAS_BEBIDA
} from '../src/shared/constants';

const prisma = new PrismaClient();

// Buffer WebP mínimo válido de alta compatibilidade
const SAMPLE_WEBP_BASE64 =
  'UklGRkIAAABXRUJQVlA4IDYAAAAwAgCdASoBAAEAAQAcJaACdLoB+AA/v398/6//8n/9v/3//f//////////////////////';
const sampleWebpBuffer = Buffer.from(SAMPLE_WEBP_BASE64, 'base64');

export async function seedMockAudits() {
  console.log('--- Iniciando Geração de Dados Mockados E2E ---');

  const uploadBaseDir = path.resolve(process.env.STORAGE_DIR || './uploads');
  if (!fs.existsSync(uploadBaseDir)) {
    fs.mkdirSync(uploadBaseDir, { recursive: true });
  }

  // 1. Busca pesquisadores e lojas
  const pesquisadores = await prisma.pesquisador.findMany({ orderBy: { id: 'asc' } });
  const lojas = await prisma.loja.findMany({ orderBy: { id: 'asc' } });

  if (pesquisadores.length === 0 || lojas.length === 0) {
    console.error('Execute npm run db:seed primeiro para carregar pesquisadores e lojas base.');
    return;
  }

  console.log(`Encontrados ${pesquisadores.length} pesquisadores e ${lojas.length} lojas.`);

  // Limpa auditorias anteriores se houver
  await prisma.foto.deleteMany();
  await prisma.geladeira.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.loja.updateMany({
    data: {
      status: 'PENDENTE',
      auditadaEm: null,
      pesquisadorId: null
    }
  });

  console.log('Limpando e resetando status para PENDENTE...');

  // Cenário:
  // - 30 Lojas CONCLUIDA (Abertas com checklist completo e 6 fotos)
  // - 8 Lojas FINALIZADA_INOPERANTE (Fechadas/Reforma com justificativa e 1 foto fachada)
  // - 19 Lojas PENDENTE (Para testes manuais do usuário em campo)

  const marcasPool = [
    'Coca-Cola', 'Fanta', 'Sprite', 'Kuat', 'Schweppes',
    'Crystal', 'Del Valle', 'Ades', 'Leão', 'Powerade', 'Monster'
  ];

  const justificativasInoperantes = [
    'Quiosque fechado com tapumes metálicos devido a reformas de modernização no mezanino da estação.',
    'Loja com portas de enrolar baixadas e aviso de recesso na entrada da passarela.',
    'Ponto comercial desocupado para troca de locatário conforme informado pelos seguranças do metrô.',
    'Acesso à loja bloqueado temporariamente por obras na linha de bloqueios da catraca.',
    'Quiosque desativado permanentemente, sem maquinário no local.',
    'Loja fechada no horário da visita, sem funcionários presentes no estabelecimento.',
    'PDV em obras civis internas com equipes de pintura e marcenaria.',
    'Não foi possível localizar o quiosque no mezanino nem nas plataformas de embarque.'
  ];

  let auditCount = 0;

  for (let i = 0; i < lojas.length; i++) {
    const loja = lojas[i];
    const pesq = pesquisadores[i % pesquisadores.length];
    const cnpjClean = loja.cnpj.replace(/\D/g, '');
    const lojaUploadDir = path.join(uploadBaseDir, cnpjClean);

    if (!fs.existsSync(lojaUploadDir)) {
      fs.mkdirSync(lojaUploadDir, { recursive: true });
    }

    // Horários simulados ao longo do dia (entre 08:30 e 17:45)
    const hora = 8 + Math.floor(i / 6);
    const minuto = (i * 11) % 60;
    const auditadaEm = new Date(2026, 8, 22, hora, minuto, 0);

    // Caso 1: Lojas 0 a 29 (30 lojas abertas concluídas)
    if (i < 30) {
      const existeGeladeira = i % 10 !== 9; // 90% tem geladeira
      const marcasPresentes = marcasPool.slice(0, 3 + (i % 7));

      const espacoLivreCaixa = i % 5 !== 4;
      const monsterPresente = i % 6 !== 5;

      // Algumas lojas com 2 ou 3 geladeiras, para testar o relatório por geladeira
      const qtdGeladeiras = !existeGeladeira ? 0 : i % 7 === 0 ? 3 : i % 4 === 0 ? 2 : 1;
      const geladeiras = Array.from({ length: qtdGeladeiras }, (_, n) => {
        const k = i + n * 2;
        const concorrentesMisturados = k % 3 === 0;
        return {
          ordem: n + 1,
          identificacao: qtdGeladeiras > 1 ? ['Vertical ao lado do caixa', 'Horizontal no balcão', 'Fundo da loja'][n] : null,
          marcaVisual: MARCA_VISUAL_GELADEIRA[k % MARCA_VISUAL_GELADEIRA.length],
          posse: POSSE_GELADEIRA[k % POSSE_GELADEIRA.length],
          monsterPresente: monsterPresente ? k % 4 !== 0 : false,
          mapaBebidas: JSON.stringify(
            CATEGORIAS_BEBIDA.map((categoria, c) => {
              const tem = (k + c) % 4 !== 3;
              return { categoria, tem, marcas: tem ? '' : null, concorrentes: tem ? (k + c) % 3 === 0 : null };
            })
          ),
          organizacao: ORGANIZACAO_GELADEIRA[k % 2],
          abastecimento: ABASTECIMENTO_GELADEIRA[k % ABASTECIMENTO_GELADEIRA.length],
          visibilidade: VISIBILIDADE_MARCAS[k % VISIBILIDADE_MARCAS.length],
          concorrentesMisturados,
          concorrentesDetalhes: concorrentesMisturados ? 'Pepsi 350ml e Guaraná Antarctica na 2ª prateleira' : null
        };
      });

      // Grava no disco as fotos exigidas pelas respostas
      const fotosParaCriar = [];
      const tiposFoto = fotosObrigatorias({
        inoperante: false,
        existeGeladeira,
        geladeiras,
        espacoLivreCaixa
      });

      for (const tipo of tiposFoto) {
        const timestamp = auditadaEm.getTime() + Math.floor(Math.random() * 5000);
        const fileName = `foto_${tipo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.webp`;
        const filePath = path.join(lojaUploadDir, fileName);
        fs.writeFileSync(filePath, sampleWebpBuffer);

        fotosParaCriar.push({
          tipo,
          url: `/uploads/${cnpjClean}/${fileName}`,
          tamanhoBytes: 320000 + (i * 3500)
        });
      }

      const auditoria = await prisma.auditoria.create({
        data: {
          lojaId: loja.id,
          pesquisadorId: pesq.id,
          statusEntrada: 'Loja aberta e operando',
          existeGeladeira,
          monsterPresente,
          monsterNaGeladeira: geladeiras.length ? geladeiras.some((g) => g.monsterPresente) : null,
          marcasCocaPresentes: JSON.stringify(marcasPresentes),
          geladeiras: { create: geladeiras },
          espacoLivreCaixa,
          espacoLadoTamanho: espacoLivreCaixa ? 'Balcão direito, aprox. 50cm livres ao lado da maquininha' : null,
          boaVisibilidadeCaixa: espacoLivreCaixa ? i % 2 === 0 : null,
          espacoDisponivel: ESPACO_DISPONIVEL[i % ESPACO_DISPONIVEL.length],
          outrosDisplaysImpulso: i % 4 === 0,
          displaysImpulsoMarcas: i % 4 === 0 ? 'Fini, Trident' : null,
          displaysImpulsoProximo: i % 4 === 0 ? true : null,
          potencialDisplay: i % 3 === 0 ? 'Alto' : i % 3 === 1 ? 'Médio' : 'Baixo',
          descricaoOportunidade: 'Excelente visibilidade e alto fluxo de passageiros no mezanino.',
          createdAt: auditadaEm,
          fotos: {
            create: fotosParaCriar
          }
        }
      });

      await prisma.loja.update({
        where: { id: loja.id },
        data: {
          status: 'CONCLUIDA',
          auditadaEm,
          pesquisadorId: pesq.id
        }
      });

      auditCount++;
    }
    // Caso 2: Lojas 30 a 37 (8 lojas inoperantes)
    else if (i < 38) {
      const justificativa = justificativasInoperantes[(i - 30) % justificativasInoperantes.length];
      const statusEntrada = (i % 3 === 0) ? 'Loja fechada' : (i % 3 === 1) ? 'Em reforma' : 'Não localizada';

      // 1 foto fachada física
      const timestamp = auditadaEm.getTime();
      const fileName = `foto_foto_fachada_${timestamp}.webp`;
      const filePath = path.join(lojaUploadDir, fileName);
      fs.writeFileSync(filePath, sampleWebpBuffer);

      await prisma.auditoria.create({
        data: {
          lojaId: loja.id,
          pesquisadorId: pesq.id,
          statusEntrada,
          justificativaInoperante: justificativa,
          createdAt: auditadaEm,
          fotos: {
            create: [
              {
                tipo: 'foto_fachada',
                url: `/uploads/${cnpjClean}/${fileName}`,
                tamanhoBytes: 295000
              }
            ]
          }
        }
      });

      await prisma.loja.update({
        where: { id: loja.id },
        data: {
          status: 'FINALIZADA_INOPERANTE',
          auditadaEm,
          pesquisadorId: pesq.id
        }
      });

      auditCount++;
    }
    // Caso 3: Lojas 38 a 56 (19 lojas PENDENTES para testes ao vivo)
    else {
      // Deixadas como PENDENTE
    }
  }

  console.log(`✓ ${auditCount} auditorias mockadas geradas com sucesso:`);
  console.log(`  - 30 Lojas CONCLUIDA (Operantes com 6 fotos e checklist completo)`);
  console.log(`  - 8 Lojas FINALIZADA_INOPERANTE (Com justificativa e foto de fachada)`);
  console.log(`  - 19 Lojas PENDENTE (Disponíveis para auditoria em tempo real)`);
  console.log(`  - Todos os 10 pesquisadores possuem dados atribuídos`);
  console.log(`  - Fotos WebP físicas gravadas na pasta uploads/{cnpj}/`);
}

const isMain = process.argv[1] && (process.argv[1].endsWith('seed-mock-audits.ts') || process.argv[1].endsWith('seed-mock-audits.js'));

if (isMain) {
  seedMockAudits()
    .catch((e) => {
      console.error('Erro ao gerar dados mockados:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
