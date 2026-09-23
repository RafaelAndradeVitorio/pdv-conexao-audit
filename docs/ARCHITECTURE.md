# Arquitetura do Sistema - PWA de Auditoria de PDV (Cliente Oculto)

Este documento detalha as decisões arquiteturais, topologia de componentes, fluxo de dados e controle de concorrência para a operação de campo com **10 pesquisadores simultâneos** e **57 lojas da RMSP**.

---

## 1. Visão Geral e Diagrama de Contexto (C4)

```mermaid
flowchart TD
    subgraph Campo["Pesquisadores em Campo (10 Usuários Mobile)"]
        MobileUser["Pesquisador (Smartphone)"]
    end

    subgraph Coordenacao["Coordenação da Operação (Desktop/Web)"]
        CoordUser["Coordenador de Campo"]
    end

    subgraph AppLayer["PWA Fullstack (Node.js + React)"]
        PWA["Frontend PWA (React 18 + Tailwind + Vite)"]
        API["Backend API (Express + TypeScript)"]
        SW["Service Worker (Cache Offline / Assets)"]
    end

    subgraph StorageLayer["Camada de Persistência & Mídias"]
        DB[(PostgreSQL 15+ com Prisma ORM)]
        Filesystem["Storage de Mídias (Local Disk / S3 R2)"]
    end

    MobileUser -->|Audita PDV & Fotos WebP| PWA
    CoordUser -->|Monitora Métricas & Exporta| PWA
    PWA <-->|Offline Cache & SWR| SW
    PWA -->|REST / Multipart / JSON| API
    API -->|Transações ACID & Trava 409| DB
    API -->|Grava / Lê Fotos Estruturadas| Filesystem
```

---

## 2. Diagrama de Sequência: Trava Anti-Duplicidade em Tempo Real

A trava anti-duplicidade atua em dois níveis complementares:
1. **No Cliente (Otimista & Reativo):** Ao selecionar ou digitar a loja, o autocomplete verifica o status. Se for `CONCLUIDA` ou `FINALIZADA_INOPERANTE`, o formulário é bloqueado imediatamente com alerta destacando quem auditou e a que horas.
2. **No Banco de Dados (Transacional & Pessimista):** Se dois pesquisadores submeterem simultaneamente a mesma loja, a transação no PostgreSQL (`lojaId` com checagem atômica) garante que apenas uma seja aceita (`201 Created`), rejeitando a concorrente com `409 Conflict`.

```mermaid
sequenceDiagram
    autonumber
    actor P1 as Pesquisador 01
    actor P2 as Pesquisador 02
    participant API as Backend API
    participant DB as PostgreSQL (Prisma Tx)

    Note over P1,P2: Ambos estão próximos à mesma loja (Ex: Estação Sé)
    P1->>API: POST /api/auditorias (Loja: loja-01)
    P2->>API: POST /api/auditorias (Loja: loja-01)
    
    API->>DB: Inicia Transação P1
    DB-->>API: Loja está PENDENTE
    API->>DB: Cria Auditoria & Atualiza Loja para CONCLUIDA
    DB-->>API: Transação P1 Commitada (201 Created)
    API-->>P1: 201 Created ("Auditoria enviada com sucesso")

    API->>DB: Inicia Transação P2
    DB-->>API: Loja status != PENDENTE (Já CONCLUIDA)
    API->>DB: Rollback Transação P2
    API-->>P2: 409 Conflict ("Esta loja já foi auditada por Ana Silva às 14:32")
```

---

## 3. Estrutura e Padronização de Storage de Fotos

O armazenamento segue rigorosamente a convenção do projeto:

```text
uploads/
└── {cnpj_sem_pontuacao}/
    ├── foto_fachada_{timestamp}.webp
    ├── foto_geladeira_{timestamp}.webp
    ├── foto_marcas_{timestamp}.webp
    ├── foto_concorrentes_{timestamp}.webp
    ├── foto_caixa_{timestamp}.webp
    └── foto_display_{timestamp}.webp
```

- **Compressão Client-Side:** Executada no dispositivo do pesquisador antes do upload via `browser-image-compression`. Fotos nativas de 8MB-12MB são convertidas para WebP Full HD (1920x1080) com ~300KB-500KB.
- **Redução de Consumo de Dados:** Economia de mais de **95% de banda móvel**, essencial para conexões 3G/4G em subsolos de estações de metrô.

---

## 4. ADRs (Architecture Decision Records)

### ADR 01: Monorepo Modular vs Repositórios Separados
- **Decisão:** Monorepo único com pastas `src/client`, `src/server`, `src/shared`.
- **Motivo:** Compartilhamento direto dos tipos TypeScript e schemas Zod entre cliente e servidor, eliminando dessincronização de contratos de API.

### ADR 02: Express + Prisma ORM + PostgreSQL
- **Decisão:** Utilização de Express tipado com Prisma ORM sobre PostgreSQL.
- **Motivo:** Conexões transacionais robustas (`$transaction`), seeds idempotentes nativos e facilidade de integração com streams de arquivos para ZIP e CSV.

### ADR 03: Service Worker com vite-plugin-pwa
- **Decisão:** Service worker configurado com estratégia `NetworkFirst` para listagem de lojas e `StaleWhileRevalidate` para lista de pesquisadores e assets estáticos.
- **Motivo:** Permite que o pesquisador continue navegando e consultando lojas mesmo em áreas de sombra de sinal de celular no mezanino das estações de metrô.
