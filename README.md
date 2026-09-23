# PDV Conexão - PWA de Auditoria em Campo (Cliente Oculto)

Aplicação completa de ponta a ponta desenvolvida para operação de campo intensiva em **57 lojas da Região Metropolitana de São Paulo** (Redes: *Monster Dog*, *Ponto Alpha* e *Better Pão de Queijo*), operada por **10 pesquisadores simultâneos** em 1 dia de auditoria, com dashboard do coordenador em tempo real, relatórios CSV/Excel e download de fotos em ZIP.

---

## Estrutura do Repositório

```text
├── docs/                      # Documentação Técnica e Operacional Completa
│   ├── ARCHITECTURE.md        # Arquitetura, diagramas C4, sequência e ADRs
│   ├── API_SPEC.md            # Especificação OpenAPI 3.0 / REST
│   ├── DATABASE.md            # DER relacional, tabelas, índices e seeds
│   ├── PWA_GUIDE.md           # Service Worker, cache e compressão WebP
│   ├── DEPLOYMENT.md          # Como rodar localmente, Docker e produção
│   └── USER_GUIDE.md          # Manual do Pesquisador e Manual do Coordenador
├── prisma/
│   ├── schema.prisma          # Modelos Pesquisador, Loja, Auditoria, Foto
│   └── seed.ts                # Seed das 57 lojas e 10 pesquisadores
├── src/
│   ├── client/                # Frontend PWA (React 18 + Tailwind + Vite)
│   ├── server/                # Backend API (Node.js + Express + Prisma)
│   └── shared/                # Kernel Compartilhado (Tipos, Enums, Zod Schemas)
├── tests/
│   ├── unit/                  # Testes unitários (Zod, compressão, métricas)
│   ├── integration/           # Testes de integração (Supertest, trava 409, ZIP, CSV)
│   └── e2e/                   # Testes Playwright (fluxo mobile e dashboard)
├── docker-compose.yml         # Container PostgreSQL 16 + App Node.js
└── package.json
```

---

## Como Iniciar

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Banco de Dados, Seeds e Mock E2E:**
   ```bash
   npm run db:push
   npm run db:seed  # Carrega 57 lojas pendentes e 10 pesquisadores
   npm run db:mock  # Popula 38 auditorias realistas (67%) com fotos físicas WebP
   ```

3. **Rodar os Testes:**
   ```bash
   npm test
   ```

4. **Iniciar em Desenvolvimento:**
   ```bash
   npm run dev
   ```
   - PWA Mobile: `http://localhost:5173`
   - API Backend: `http://localhost:3000`

Consulte a pasta [`docs/`](./docs) para todos os detalhes arquiteturais e operacionais.
