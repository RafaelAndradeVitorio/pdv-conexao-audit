# Stage 1: Build da aplicação
FROM node:22-alpine AS builder

WORKDIR /app

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

COPY package*.json ./
COPY prisma ./prisma/

# Instala apenas dependências de produção
RUN npm ci --omit=dev
RUN npx prisma generate

# Copia artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist-server/server/server.js"]
