# Modelo Relacional do Banco de Dados - PDV Auditoria

Este documento descreve o modelo de dados relacional implementado em PostgreSQL e gerenciado via Prisma ORM.

---

## 1. Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    PESQUISADORES ||--o{ AUDITORIAS : realiza
    LOJAS ||--o| AUDITORIAS : possui
    AUDITORIAS ||--|{ FOTOS : contem

    PESQUISADORES {
        string id PK "Identificador único (ex: pesq-01)"
        string nome "Nome completo do pesquisador"
        string telefone "Telefone de contato de campo"
        datetime created_at "Data de cadastro"
    }

    LOJAS {
        string id PK "Identificador único (ex: loja-01)"
        string rede "Rede comercial (Monster Dog, Ponto Alpha, etc)"
        string nome "Nome de identificação do PDV"
        string endereco "Endereço completo"
        string estacao_metro "Estação de Metrô / CPTM de referência"
        string cnpj UK "CNPJ sem pontuação (14 dígitos)"
        string cnpj_formatado "CNPJ formatado para exibição"
        string status "PENDENTE | CONCLUIDA | FINALIZADA_INOPERANTE"
        datetime auditada_em "Timestamp de conclusão da auditoria"
        string pesquisador_id "ID do pesquisador que concluiu"
        datetime created_at "Data de inserção"
    }

    AUDITORIAS {
        string id PK "CUID auto-gerado"
        string loja_id UK, FK "Chave estrangeira única (Trava Anti-Duplicidade)"
        string pesquisador_id FK "Chave estrangeira do pesquisador"
        string status_entrada "Aberta, Fechada, Em Reforma, Não Localizada"
        string justificativa_inoperante "Obrigatório se inoperante"
        boolean existe_geladeira "Indica presença de refrigerador"
        string marca_visual_geladeira "Coca-Cola, Monster, Outra, etc"
        string posse_geladeira "FEMSA, Monster, Outro"
        string organizacao_geladeira "Cheia, Boa, Média, Baixa, Quase vazia"
        boolean monster_presente "Presença de Monster Energy"
        boolean monster_na_geladeira "Monster gelado no refrigerador"
        string marcas_coca_presentes "JSON array de marcas presentes"
        boolean concorrentes_misturados "Concorrência na geladeira FEMSA"
        string concorrentes_detalhes "Quais marcas e em qual prateleira"
        boolean espaco_livre_caixa "Espaço livre próximo ao caixa"
        string espaco_lado_tamanho "Lado e dimensão do espaço"
        boolean outros_displays_impulso "Outros displays presentes"
        string potencial_display "Alto, Médio, Baixo"
        string descricao_oportunidade "Observações do pesquisador"
        datetime created_at "Timestamp da submissão"
    }

    FOTOS {
        string id PK "CUID auto-gerado"
        string auditoria_id FK "Chave estrangeira da auditoria"
        string tipo "foto_fachada, foto_geladeira, etc"
        string url "Caminho relativo ou URL da foto"
        int tamanho_bytes "Tamanho do arquivo compactado WebP"
        datetime created_at "Timestamp do upload"
    }
```

---

## 2. Tabelas e Índices

### Tabela `pesquisadores`
Armazena a equipe de 10 pesquisadores de campo.
- **PK:** `id` (VARCHAR)
- **Campos:** `nome` (VARCHAR), `telefone` (VARCHAR), `created_at` (TIMESTAMP)

### Tabela `lojas`
Armazena os 57 pontos de venda na Região Metropolitana de São Paulo.
- **PK:** `id` (VARCHAR)
- **Unique:** `cnpj` (VARCHAR 14 dígitos)
- **Índices de Performance:**
  - `idx_lojas_rede`: Otimiza filtros por rede no dashboard.
  - `idx_lojas_status`: Acelera filtragem de lojas pendentes versus concluídas.
  - `idx_lojas_cnpj`: Busca instantânea no autocomplete de campo.

### Tabela `auditorias`
Registra a auditoria finalizada de cada loja.
- **PK:** `id` (VARCHAR)
- **Unique & FK:** `loja_id` (VARCHAR) -> Referencia `lojas(id)`. A restrição de unicidade no banco atua como a garantia máxima de atomicidade contra concorrência e condições de corrida entre os pesquisadores.
- **FK:** `pesquisador_id` -> Referencia `pesquisadores(id)`.

### Tabela `fotos`
Guarda os registros fotográficos WebP vinculados a cada auditoria.
- **PK:** `id` (VARCHAR)
- **FK:** `auditoria_id` -> Referencia `auditorias(id)` com regra `ON DELETE CASCADE`.
- **Índice:** `idx_fotos_auditoria`: Acelera a compilação do relatório CSV e streaming do arquivo ZIP.

---

## 3. Seed Automático (`npm run db:seed`)

O script de seed (`prisma/seed.ts`) popula:
1. **10 Pesquisadores Pré-Cadastrados:** Nomes reais de pesquisadores e telefones formatados.
2. **57 Lojas da RMSP:** Distribuídas equilibradamente entre as redes:
   - **Monster Dog** (22 lojas)
   - **Ponto Alpha** (18 lojas)
   - **Better Pão de Queijo** (17 lojas)
   Todas localizadas em pontos de alto fluxo de passageiros nas linhas 1-Azul, 2-Verde, 3-Vermelha, 4-Amarela, 5-Lilás e CPTM (estações Sé, Luz, Brás, Paulista, Pinheiros, Tatuapé, Barra Funda, etc.).
