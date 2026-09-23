# Especificação da API REST - PDV Auditoria (OpenAPI 3.0 Compatible)

**Base URL:** `http://localhost:3000/api` (ou `/api` via Vite Proxy em desenvolvimento)

---

## 1. Endpoints de Pesquisadores

### `GET /pesquisadores`
Retorna a lista dos 10 pesquisadores pré-cadastrados na equipe de campo.

**Resposta 200 OK:**
```json
[
  {
    "id": "pesq-01",
    "nome": "Ana Silva",
    "telefone": "(11) 98765-4321",
    "created_at": "2026-09-22T20:00:00.000Z"
  }
]
```

---

## 2. Endpoints de Lojas (PDVs)

### `GET /lojas`
Lista lojas com suporte a filtros e busca em tempo real.

**Parâmetros de Consulta (Query Params):**
- `status`: `TODOS` | `PENDENTE` | `CONCLUIDA` | `FINALIZADA_INOPERANTE`
- `rede`: `TODAS` | `Monster Dog` | `Ponto Alpha` | `Better Pão de Queijo`
- `search`: Termo de busca (filtra por Nome da Loja, Estação, Endereço ou CNPJ)

**Resposta 200 OK:**
```json
[
  {
    "id": "loja-01",
    "rede": "Monster Dog",
    "nome": "Monster Dog - Estação Sé",
    "endereco": "Mezanino da Estação de Metrô Sé, Linha 1-Azul, São Paulo - SP",
    "estacaoMetro": "Sé",
    "cnpj": "12345678000101",
    "cnpjFormatado": "12.345.678/0001-01",
    "status": "PENDENTE",
    "auditadaEm": null,
    "pesquisadorId": null,
    "pesquisadorNome": null
  }
]
```

### `GET /lojas/:id`
Retorna detalhes completos de uma loja específica, incluindo auditoria realizada e fotos associadas.

---

## 3. Endpoints de Auditoria

### `POST /auditorias`
Submete uma auditoria de campo. Possui trava transacional anti-duplicidade em nível de banco de dados.

**Body (Loja Aberta e Operando):**
```json
{
  "lojaId": "loja-01",
  "pesquisadorId": "pesq-01",
  "statusEntrada": "Loja aberta e operando",
  "existeGeladeira": true,
  "marcaVisualGeladeira": "Coca-Cola",
  "posseGeladeira": "FEMSA",
  "organizacaoGeladeira": "Cheia",
  "monsterPresente": true,
  "monsterNaGeladeira": true,
  "marcasCocaPresentes": ["Coca-Cola", "Fanta", "Sprite", "Monster"],
  "concorrentesMisturados": false,
  "espacoLivreCaixa": true,
  "espacoLadoTamanho": "Lado direito do caixa, 50cm",
  "outrosDisplaysImpulso": false,
  "potencialDisplay": "Alto",
  "descricaoOportunidade": "Excelente fluxo em frente ao terminal de pagamento",
  "fotos": [
    { "tipo": "foto_fachada", "url": "/uploads/12345678000101/foto_foto_fachada_1710000000.webp", "tamanhoBytes": 320000 },
    { "tipo": "foto_geladeira", "url": "/uploads/12345678000101/foto_foto_geladeira_1710000000.webp", "tamanhoBytes": 350000 },
    { "tipo": "foto_marcas", "url": "/uploads/12345678000101/foto_foto_marcas_1710000000.webp", "tamanhoBytes": 310000 },
    { "tipo": "foto_concorrentes", "url": "/uploads/12345678000101/foto_foto_concorrentes_1710000000.webp", "tamanhoBytes": 290000 },
    { "tipo": "foto_caixa", "url": "/uploads/12345678000101/foto_foto_caixa_1710000000.webp", "tamanhoBytes": 330000 },
    { "tipo": "foto_display", "url": "/uploads/12345678000101/foto_foto_display_1710000000.webp", "tamanhoBytes": 340000 }
  ]
}
```

**Body (Loja Inoperante / Fechada):**
```json
{
  "lojaId": "loja-02",
  "pesquisadorId": "pesq-01",
  "statusEntrada": "Loja fechada",
  "justificativaInoperante": "Tapumes metálicos bloqueando o acesso devido a reformas na estação",
  "fotos": [
    { "tipo": "foto_fachada", "url": "/uploads/12345678000102/foto_foto_fachada_1710000000.webp", "tamanhoBytes": 320000 }
  ]
}
```

**Respostas:**
- **`201 Created`**:
  ```json
  {
    "message": "Auditoria enviada com sucesso!",
    "auditoria": { "id": "cm...", "lojaId": "loja-01", ... }
  }
  ```
- **`400 Bad Request`** (Validação Zod):
  ```json
  {
    "error": "Erro de validação do formulário",
    "issues": [
      { "campo": "fotos", "mensagem": "Foto obrigatória ausente: foto_geladeira" }
    ]
  }
  ```
- **`409 Conflict`** (Trava Anti-Duplicidade Acionada):
  ```json
  {
    "error": "Esta loja já foi auditada por Ana Silva às 14:35:10",
    "lojaNome": "Monster Dog - Estação Sé",
    "pesquisadorNome": "Ana Silva",
    "auditadaEm": "22/09/2026, 14:35:10"
  }
  ```

---

### `POST /auditorias/upload-foto`
Recebe uma foto para armazenamento no padrão `{cnpj}/foto_{tipo}_{timestamp}.webp`. Suporta upload `multipart/form-data` ou payload JSON com campo `base64`.

**Body JSON:**
```json
{
  "cnpj": "12345678000101",
  "tipo": "foto_fachada",
  "base64": "data:image/webp;base64,UklGR..."
}
```

**Resposta 201 Created:**
```json
{
  "url": "/uploads/12345678000101/foto_foto_fachada_1710000000.webp",
  "tamanhoBytes": 345120
}
```

---

### `GET /auditorias/dashboard`
Retorna os números consolidados em tempo real para o painel do coordenador.

**Resposta 200 OK:**
```json
{
  "totalLojas": 57,
  "totalConcluidas": 35,
  "totalInoperantes": 5,
  "totalPendentes": 17,
  "percentualConcluido": 70,
  "porRede": {
    "Monster Dog": { "total": 22, "concluidas": 15, "inoperantes": 2, "pendentes": 5 },
    "Ponto Alpha": { "total": 18, "concluidas": 12, "inoperantes": 2, "pendentes": 4 },
    "Better Pão de Queijo": { "total": 17, "concluidas": 8, "inoperantes": 1, "pendentes": 8 }
  },
  "porPesquisador": {
    "Ana Silva": 6,
    "Bruno Costa": 5
  }
}
```

---

## 4. Endpoints de Exportação do Coordenador

### `GET /export/csv`
Gera e baixa o arquivo CSV compatível com Microsoft Excel (com delimitador `;` e BOM UTF-8 `\uFEFF`). Todas as respostas de perguntas são mapeadas por coluna com links clicáveis para cada uma das fotos.

**Headers de Resposta:**
```text
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="relatorio_auditorias_pdv_2026-09-22.csv"
```

### `GET /export/zip`
Inicia o download compactado em formato ZIP de todas as fotos arquivadas, estruturadas internamente por diretórios nomeados com o Nome higienizado de cada loja auditada (ex: `Monster Dog - Estação Sé/foto_fachada_....webp`).

**Headers de Resposta:**
```text
Content-Type: application/zip
Content-Disposition: attachment; filename="fotos_auditorias_pdv_2026-09-22.zip"
```
