# Guia de Instalação e Deploy - PDV Conexão

Este documento instrui como executar o projeto localmente para desenvolvimento e como realizar o deploy em ambientes de homologação ou produção.

---

## 1. Como Rodar Localmente

### Pré-requisitos
- **Node.js:** Versão 20+ ou 22+ (LTS)
- **NPM:** 10+
- **PostgreSQL:** Versão 14+ (Local ou via Docker)

### Passo a Passo

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   Ajuste a variável `DATABASE_URL` se necessário:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=pdv_audit"
   PORT=3000
   VITE_API_URL="/api"
   STORAGE_DIR="./uploads"
   ```

3. **Sincronizar o Banco de Dados com o Prisma:**
   ```bash
   npm run db:push
   ```

4. **Executar a Carga Inicial dos 10 Pesquisadores e 57 Lojas:**
   ```bash
   npm run db:seed
   ```

5. **Iniciar a aplicação em modo desenvolvimento:**
   ```bash
   npm run dev
   ```
   - **Frontend PWA:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)
   - **Healthcheck:** [http://localhost:3000/health](http://localhost:3000/health)

---

## 2. Executando via Docker Compose

Para subir a aplicação completa isolada em containers:

```bash
docker-compose up --build -d
```

O compose inicializa:
1. **Banco de Dados PostgreSQL 16** na porta 5432 com volume persistente.
2. **Aplicação Fullstack Node.js** na porta 3000 com migrações automáticas e seed executados no startup.

Acesse diretamente no navegador em `http://localhost:3000`.

---

## 3. Deploy no Railway (Passo a Passo em 3 Minutos)

O Railway é o provedor mais recomendado para esta operação, pois executa tanto o PostgreSQL quanto a aplicação Node.js 24/7 sem colocar o servidor para "dormir", garantindo que os 10 pesquisadores em campo nunca enfrentem lentidão ou timeouts.

### Passo 1: Criar o Projeto no Railway
1. Acesse [railway.com](https://railway.com) e crie uma conta gratuita com seu GitHub.
2. Clique no botão **"New Project"**.

### Passo 2: Adicionar o Banco PostgreSQL
1. No menu do projeto, selecione **"Provision PostgreSQL"**.
2. O Railway criará uma instância dedicada do PostgreSQL em segundos e gerará a variável `${{Postgres.DATABASE_URL}}`.

### Passo 3: Adicionar a Aplicação
1. No mesmo projeto, clique em **"Create" > "GitHub Repo"** e selecione o repositório do projeto.
2. O Railway detectará o `Dockerfile` automaticamente.

### Passo 4: Configurar as Variáveis de Ambiente
Na aba **Variables** do serviço da aplicação, adicione:
- `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` *(ou selecione "Add Reference" apontando para o PostgreSQL)*
- `NODE_ENV`: `production`
- `GOOGLE_DRIVE_FOLDER_ID`: `11ax5g10dzEhEql3fGS3i-uxwz6vduKvj`
- `GOOGLE_DRIVE_WEBHOOK_URL`: URL `/exec` do Web App do Google Apps Script (não registre essa URL no repositório: ela dá acesso de escrita à pasta do Drive)
- `COORD_PIN`: PIN de acesso ao painel do coordenador (sem ele o painel, os exports e o reset de lojas ficam abertos)
- `COORD_SESSION_SECRET` *(opcional)*: segredo das sessões do coordenador. Se definido, as sessões sobrevivem a reinícios do servidor

*(Nota: A variável `PORT` é injetada automaticamente pelo Railway).*

### Passo 5: Gerar Domínio Público HTTPS
1. Na aba **Settings** do serviço da aplicação, vá em **Networking > Public Networking**.
2. Clique em **"Generate Domain"** (ex: `pdv-conexao-audit.up.railway.app`).
3. O Railway gera o certificado SSL/HTTPS automaticamente, permitindo o uso da câmera nos celulares dos pesquisadores!

*(O container executa o `npx prisma db push` e o bootstrap automático das 57 lojas e 10 pesquisadores no primeiro startup).*

---

## 4. Scripts Disponíveis no `package.json`

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia simultaneamente o servidor backend e o bundler Vite em watch mode |
| `npm run build` | Compila o frontend (`build:client`) e o servidor backend (`build:server`) |
| `npm run start` | Executa o servidor backend compilado em modo produção |
| `npm run db:push` | Sincroniza o schema Prisma diretamente no PostgreSQL |
| `npm run db:seed` | Popula o banco com os 10 pesquisadores e 57 PDVs da RMSP |
| `npm run test` | Executa a suíte de testes Vitest |
| `npm run test:unit` | Roda testes unitários de Zod, compressão e cálculos |
| `npm run test:integration` | Roda testes de integração com Supertest na API |
| `npm run test:e2e` | Executa testes end-to-end com Playwright |
