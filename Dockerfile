# Stage 1: Build da aplicação
FROM node:22-alpine AS builder

WORKDIR /app

# Dummy DATABASE_URL para permitir que o 'prisma generate' compile os tipos no build do Docker
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=pdv_audit"

# Copia manifests de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências
RUN npm ci

# Copia código fonte
COPY . .

# Gera cliente Prisma e compila Frontend e Backend
RUN npx prisma generate
RUN npm run build

# Stage 2: Imagem final de execução
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=pdv_audit"

COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências de produção (incluindo prisma)
RUN npm ci --omit=dev
RUN npx prisma generate

# Copia artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3000

# Na execução, a DATABASE_URL real do Railway substitui a dummy acima
CMD ["sh", "-c", "npx prisma db push && node dist-server/server/server.js"]
