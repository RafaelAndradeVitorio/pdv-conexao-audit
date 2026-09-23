# Manual Operacional - PDV Auditoria (Pesquisador & Coordenador)

Guia prático de operação para o dia da ação intensiva de auditoria em 57 lojas da Região Metropolitana de São Paulo.

---

## PARTE 1: MANUAL DO PESQUISADOR (MOBILE PWA)

### 1. Como Instalar o PWA no Celular
1. Abra o navegador do seu celular (Safari no iPhone ou Chrome no Android).
2. Acesse o link fornecido pela coordenação.
3. No Safari: toque no botão **Compartilhar** e selecione **"Adicionar à Tela de Início"**.
4. No Chrome: toque no menu de 3 pontinhos e selecione **"Instalar Aplicativo"**.
5. O ícone do **PDV Conexão** aparecerá na sua tela de início como um app nativo.

---

### 2. Passo a Passo do Fluxo de Campo

#### Passo 1: Identifique-se
- No topo da tela, abra a caixa **"Identificação do Pesquisador"**.
- Selecione o seu nome entre os 10 pesquisadores da equipe.
- Essa informação fica salva no seu aparelho para as próximas visitas.

#### Passo 2: Selecione o PDV (Loja)
- No campo **"Seleção do PDV"**, digite o nome da loja, a estação de metrô ou os números do CNPJ.
- Toque no resultado correspondente.
- **Caso a loja já tenha sido auditada:** Você verá uma tarja vermelha com o aviso:
  > *"Esta loja já foi auditada por [Nome do Colega] às [Horário]."*
  O formulário será travado para evitar retrabalho. Escolha outra loja pendente.
- **Caso a loja esteja pendente:** O formulário será liberado com uma tarja verde.

#### Passo 3: Situação de Entrada no PDV
- **Se a loja estiver aberta e operando:** Selecione "Loja aberta e operando".
- **Se a loja estiver fechada, em reforma ou não for localizada:**
  1. Selecione a opção correspondente ("Loja fechada", "Em reforma" ou "Não localizada").
  2. Digite a justificativa detalhada no campo que será exibido.
  3. Tire apenas a **Foto 01 (Fachada)** comprovando a situação.
  4. Toque em **"Finalizar Auditoria"**. O sistema registrará como `FINALIZADA_INOPERANTE`.

#### Passo 4: Preenchimento do Checklist (Loja Aberta)
1. **Geladeira de Bebidas:** Responda se existe geladeira, selecione a marca visual (Coca-Cola, Monster, Outra), a posse e o nível de abastecimento.
2. **Monster Energy & Marcas Coca-Cola:** Indique se Monster está presente e se está gelado. Toque nos botões de cada marca presente no ponto de venda.
3. **Concorrência:** Se houver marcas concorrentes na mesma geladeira da FEMSA, marque "Sim" e especifique quais marcas e em qual prateleira.
4. **Área do Caixa & Display "Coca-Cola Vai Até Você":** Avalie se há espaço livre próximo ao caixa, anote as dimensões aproximadas e classifique o potencial do display (Alto, Médio ou Baixo).

#### Passo 5: Registro Fotográfico (6 Fotos Obrigatórias)
Para cada um dos 6 cards de fotos:
- **Foto 01:** Fachada da Loja
- **Foto 02:** Geladeira Fechada
- **Foto 03:** Geladeira Aberta (Marcas)
- **Foto 04:** Concorrentes / Detalhes
- **Foto 05:** Área do Caixa
- **Foto 06:** Espaço do Display / Oportunidade

1. Toque em **"Tirar Foto"**.
2. Aponte a câmera com boa iluminação e foco nítido nos produtos.
3. A foto é automaticamente compactada no próprio aparelho de ~10MB para ~300KB WebP.
4. Você pode visualizar a imagem ou tocar em **"Refazer"** se ficou borrada.

#### Passo 6: Finalizar e Enviar
Toque no botão principal **"Finalizar Auditoria"**. Aguarde a mensagem de confirmação em verde e dirija-se à próxima estação/loja.

---

## PARTE 2: MANUAL DO COORDENADOR (DASHBOARD WEB)

### 1. Acessando a Visão do Coordenador
No topo superior direito do aplicativo, clique no botão **"Coordenador"**.

### 2. Monitoramento de Indicadores em Tempo Real
- **Progresso Geral:** Visualize o percentual e o total de lojas visitadas (ex: 35 de 57).
- **Subtotais:** Veja a contagem dividida entre *Operantes Concluídas*, *Inoperantes* e *Pendentes*.
- **Desempenho por Rede:** Acompanhe o percentual de cobertura das redes Monster Dog, Ponto Alpha e Better Pão de Queijo.
- **Produtividade da Equipe:** Ranking de auditorias concluídas por cada um dos 10 pesquisadores.

### 3. Filtros e Tabela de Lojas
- Filtre a tabela por **Rede** específica ou por **Status** (ex: listar apenas lojas *Pendentes* para orientar pesquisadores que estejam próximos).
- Utilize o campo de busca rápida por texto para localizar qualquer PDV ou CNPJ.

### 4. Exportação de Relatórios e Mídias
- **Botão "Exportar Relatório Excel/CSV":** Baixa instantaneamente uma planilha CSV estruturada com todas as respostas preenchidas em campo, dados de contato e links diretos clicáveis para cada foto na nuvem.
- **Botão "Download ZIP de Fotos":** Compacta e inicia o download de todas as fotografias registradas no dia, organizadas em subpastas com o Nome da Loja de cada PDV (ex: `Monster Dog - Estação Sé/foto_fachada_....webp`).
