# Alloc Link — Contrato de integração Frontend ↔ Backend

**Versão:** rascunho v1 — 17/11/2026  
**Destinatário:** responsável pelo Backend (Antônio Pedro)  
**Referência utilizada:** `core.js`, `client.js`, `admin.js`, `profile.js`, `index.html` e scripts SQL iniciais fornecidos no projeto.  
**Situação:** campos confirmados **no código do Frontend**; **rotas e alterações no banco são propostas**, sujeitas a alinhamento. Este documento **não comprova que a API já está implementada**.

## 1. Como usar este arquivo

1. **Backend:** consulte os nomes JSON de cada entidade e devolva os mesmos nomes nas respostas da API.
2. **Banco:** mantenha nomes em português no PostgreSQL, se preferir. Converta na API (ex.: `maquina_id` → `machineId`).
3. **Frontend:** use o `api.js` para fazer `fetch`; não acesse PostgreSQL diretamente.
4. **Equipe:** acerte os itens em **⚠ Pontos a decidir** antes de integrar cada tela.
5. **Padrão de tipos sugerido:** IDs como **string** no JSON (mesmo que o banco use `BIGINT`), quantidades como **number inteiro**, datas como `YYYY-MM-DD`, horários como ISO 8601 (`2026-11-17T14:30:00Z`). Se o time optar por IDs numéricos, o Frontend precisará normalizar IDs antes de comparações com `===`.

> Este contrato registra **campos de dados e formulários que circulam entre Frontend e Backend**, não cada variável interna de interface (ícones, botões, abas, estilos, `localStorage`, etc.).

## 2. Visão geral: estrutura que o `core.js` usa

```json
{
  "company": {},
  "machines": [],
  "bookings": [],
  "requests": []
}
```

- `company` = uma empresa/locadora por ambiente no MVP;
- `machines` = máquinas da frota;
- `bookings` = alocações efetivadas;
- `requests` = solicitações de clientes;
- **perfil do usuário** (`profile.js`) é separado desse objeto e usa `nome`, `email`, `telefone`.

O Backend pode entregar os recursos por rotas separadas; **não é obrigatório** criar uma rota que devolva o objeto inteiro.

## 3. EMPRESA — `company`

### Exemplo de JSON enviado/recebido

```json
{
  "name": "Locadora Exemplo",
  "tagline": "Equipamentos para sua obra",
  "description": "Locação de máquinas pesadas e equipamentos.",
  "city": "Belo Jardim",
  "state": "PE",
  "address": "Endereço de exemplo",
  "phone": "(87) 3000-0000",
  "whatsapp": "(87) 99999-0000",
  "email": "contato@exemplo.com",
  "brand": "#278445",
  "logo": "assets/logo-generica.svg"
}
```

| JSON do Frontend | Tipo | Formulário | Coluna no SQL inicial | Observação |
|---|---|---|---|---|
| `name` | string | obrigatório, até 90 caracteres | `empresas.nome` | Nome exibido no catálogo |
| `tagline` | string | opcional, até 160 | **não existe** | Descrição curta; decidir inclusão |
| `description` | string | opcional, até 600 | `empresas.descricao` | Texto principal da empresa |
| `city` | string | obrigatório | `empresas.cidade` | Cidade |
| `state` | string | obrigatório, 2 letras | `empresas.estado` | Ex.: `PE` |
| `address` | string | opcional, até 180 | **não existe** | Decidir inclusão |
| `phone` | string | opcional | `empresas.telefone` | Telefone comercial |
| `whatsapp` | string | opcional; Front valida 10–13 dígitos | `empresas.whatsapp` | Canal de contato |
| `email` | string | opcional, tipo e-mail | **não existe** | Decidir inclusão |
| `brand` | string | cor hexadecimal | `empresas.cor_principal` | Ex.: `#278445` |
| `logo` | string | imagem PNG/JPG/WebP no formulário | `empresas.logo_url` | No protótipo pode ser Data URL (`data:image/...`); para API é preferível usar URL armazenada ou upload de arquivo |

**Campos que o banco tem e o formulário não envia:** `empresas.id`, `criado_em`. A API deve gerenciá-los, sem confiar em valores criados pelo navegador.

## 4. MÁQUINAS — `machines[]`

### Exemplo de JSON

```json
{
  "id": "21",
  "name": "Retroescavadeira",
  "category": "Escavação",
  "type": "Escavação e apoio em obras",
  "brand": "JCB",
  "model": "3CX",
  "purpose": "Abrir valas e movimentar materiais.",
  "description": "Equipamento para obras e serviços gerais.",
  "image": "retroescavadeira",
  "origin": "propria",
  "partner": "",
  "partnerContact": "",
  "quantity": 3,
  "maintenanceQty": 1,
  "maintenance": false
}
```

| JSON do Frontend | Tipo | Validação no formulário | Coluna SQL / observação |
|---|---|---|---|
| `id` | string | atribuído na API | `maquinas.id` — SQL `BIGINT` |
| `name` | string | obrigatório, até 70 | `maquinas.nome` |
| `category` | string | uma das categorias abaixo | `maquinas.categoria` |
| `type` | string | obrigatório, até 60 | **não existe** — decidir coluna para tipo/aplicação |
| `brand` | string | obrigatório, até 60 | `maquinas.marca` |
| `model` | string | obrigatório, até 60 | `maquinas.modelo` |
| `purpose` | string | obrigatório, até 420 | `maquinas.finalidade` |
| `description` | string | opcional, até 500 | `maquinas.descricao` |
| `image` | string | valor de uma das 4 imagens internas | `maquinas.imagem_url` exige adaptação: Front usa **slug**, SQL usa URL |
| `origin` | string | `propria` ou `terceiros` | `maquinas.origem` |
| `partner` | string | obrigatório quando `origin=terceiros` | `maquinas.nome_parceiro` |
| `partnerContact` | string | opcional | **não existe** — decidir inclusão |
| `quantity` | number (inteiro) | obrigatório, **1 a 100** | `maquinas.quantidade_total` |
| `maintenanceQty` | number (inteiro) | **0 até `quantity`** | `maquinas.quantidade_manutencao` |
| `maintenance` | boolean | **calculado** (`maintenanceQty >= quantity`) | Não precisa armazenar: derivado |

**Categorias aceitas no formulário:** `Escavação`, `Terraplenagem`, `Carga e movimentação`, `Nivelamento`, `Operação geral`.

**Imagens aceitas no formulário:** `retroescavadeira`, `trator-esteira`, `pa-carregadeira`, `motoniveladora`. O `core.js` usa esse slug para construir o caminho `assets/<slug>.svg`; se a API passar diretamente uma URL em `image`, é preciso adaptar o Frontend ou traduzir a URL para slug.

**Outros campos SQL (não enviados nesse formulário):** `empresa_id`, `ativo`, `criado_em`.

## 5. SOLICITAÇÕES — `requests[]`

### Exemplo de criação no catálogo — cliente **envia**

```json
{
  "machineId": "21",
  "name": "Cliente Exemplo",
  "phone": "(87) 99999-0000",
  "location": "Belo Jardim - PE",
  "start": "2026-12-01",
  "end": "2026-12-03",
  "quantity": 1
}
```

### Exemplo de resposta — Backend **devolve**

```json
{
  "id": "105",
  "machineId": "21",
  "name": "Cliente Exemplo",
  "phone": "(87) 99999-0000",
  "location": "Belo Jardim - PE",
  "start": "2026-12-01",
  "end": "2026-12-03",
  "quantity": 1,
  "status": "pendente",
  "createdAt": "2026-11-17T14:30:00Z",
  "decidedAt": null
}
```

| JSON do Frontend | Tipo | Regra / SQL |
|---|---|---|
| `id` | string | gerado no Backend; `solicitacoes.id` |
| `machineId` | string | máquina selecionada; `solicitacoes.maquina_id` |
| `name` | string | mínimo de 3 caracteres no Front; `solicitacoes.nome_cliente` |
| `phone` | string | 10 a 13 dígitos (sem contar máscara); `solicitacoes.telefone_cliente` |
| `location` | string | opcional, HTML até 120; `solicitacoes.local_servico` |
| `start` | string (`YYYY-MM-DD`) | início igual ou posterior à data atual no envio; `solicitacoes.data_inicio` |
| `end` | string (`YYYY-MM-DD`) | igual ou posterior a `start`; `solicitacoes.data_fim` |
| `quantity` | number (inteiro) | pelo menos 1, respeitando disponibilidade; `solicitacoes.quantidade` |
| `status` | string | `pendente`, `aprovado` ou `recusado` no Front |
| `createdAt` | string ISO | criado no servidor; `solicitacoes.criado_em` |
| `decidedAt` | string ISO ou null | gravado quando aprova/recusa; **não existe** no SQL inicial |

**⚠ Divergência importante:** SQL usa `pendente`, `aprovada`, `recusada`; Frontend usa `pendente`, `aprovado`, `recusado`. É preciso **padronizar ou mapear** esses valores na API. Não devolva `aprovada` diretamente ao Frontend atual, pois os filtros e botões podem falhar.

**Regra atual:** solicitação pendente **não bloqueia estoque**. A aprovação cria uma alocação ativa e altera o status da solicitação. Valide novamente a disponibilidade na transação do Backend.

## 6. ALOCAÇÕES — `bookings[]`

### Exemplo de criação manual no painel — administrador envia

```json
{
  "machineId": "21",
  "customer": "Cliente Exemplo",
  "contact": "(87) 99999-0000",
  "location": "Obra em Belo Jardim",
  "quantity": 1,
  "start": "2026-12-01",
  "end": "2026-12-03"
}
```

### Exemplo de resposta

```json
{
  "id": "88",
  "machineId": "21",
  "customer": "Cliente Exemplo",
  "contact": "(87) 99999-0000",
  "location": "Obra em Belo Jardim",
  "quantity": 1,
  "start": "2026-12-01",
  "end": "2026-12-03",
  "status": "ativa",
  "requestId": "105",
  "createdAt": "2026-11-17T14:31:00Z",
  "endedAt": null
}
```

| JSON do Frontend | Tipo | Regra / SQL |
|---|---|---|
| `id` | string | servidor; `alocacoes.id` |
| `machineId` | string | `alocacoes.maquina_id` |
| `customer` | string | obrigatório, até 90; `alocacoes.nome_cliente` |
| `contact` | string | opcional, até 22; **não existe** no SQL inicial |
| `location` | string | obrigatório no formulário do administrador, até 130; `alocacoes.local_servico` (SQL permite null) |
| `quantity` | number (inteiro) | de 1 até estoque disponível; `alocacoes.quantidade` |
| `start` | string (`YYYY-MM-DD`) | `alocacoes.data_inicio` |
| `end` | string (`YYYY-MM-DD`) | `alocacoes.data_fim` |
| `status` | string | Front usa `ativa` e `encerrada`; SQL também permite `cancelada` |
| `requestId` | string ou null | vínculo opcional com solicitação; `alocacoes.solicitacao_id` |
| `createdAt` | string ISO | `alocacoes.criado_em` |
| `endedAt` | string ISO ou null | gravado ao encerrar; **não existe** no SQL inicial |

**Regra de estoque (período inclusivo):**

```
capacidade = quantity - maintenanceQty
livresNoPeriodo = capacidade - maiorTotalAlocadoSimultaneamenteEmQualquerDia
```

Apenas alocações **ativas** consomem estoque. Se duas operações acontecerem juntas, o Backend deve validar em **transação com bloqueio** antes de aprovar/inserir; conferir apenas no navegador não evita excesso de reservas.

## 7. USUÁRIO / MEU PERFIL — `profile.js`

### JSON esperado na tela Meu perfil

```json
{
  "nome": "Administrador Exemplo",
  "email": "administrador@exemplo.com",
  "telefone": "(87) 99999-0000"
}
```

| JSON da tela | Tipo | Validação no Front | Coluna SQL |
|---|---|---|---|
| `nome` | string | obrigatório, até 120 | `usuarios.nome` |
| `email` | string | obrigatório, e-mail válido, até 180 | `usuarios.email` |
| `telefone` | string | opcional, até 25 | `usuarios.telefone` |

**Dados existentes no banco, mas não editáveis nessa tela:** `id`, `empresa_id`, `senha_hash`, `foto_url`, `papel`, `ativo`, `criado_em`, `atualizado_em`. O Backend pode usar `id`, `papel`, `empresa_id` internamente; **nunca envie `senha_hash` ao navegador**.

**Login:** o formulário utiliza `email` e `password`. O login atual é demonstrativo e precisa ser trocado por autenticação real. O Backend deve validar a senha contra um hash seguro e gerenciar sessão; o Frontend **não** deve validar credenciais fixas na produção.

## 8. Rotas da API — PROPOSTA para alinhar

**Base de exemplo:** `http://localhost:3000/api` — confirmar porta e prefixo com a equipe. O `api.js` discutido anteriormente já prevê algumas dessas operações, mas **nem todas estão implementadas no Frontend**.

| Ação | Método e rota sugeridos | JSON |
|---|---|---|
| Consultar máquinas | `GET /maquinas` | array de máquinas |
| Cadastrar máquina | `POST /maquinas` | dados de máquina sem `id` |
| Editar máquina | `PUT /maquinas/:id` | dados editáveis de máquina |
| Consultar disponibilidade | `GET /maquinas/:id/disponibilidade?start=YYYY-MM-DD&end=YYYY-MM-DD` | `{ "available": 2 }` (proposta) |
| Consultar empresa logada | `GET /empresas/me` | objeto `company` |
| Editar empresa | `PUT /empresas/me` | objeto `company` |
| Consultar perfil logado | `GET /usuarios/me` | objeto com `nome`, `email`, `telefone` |
| Editar perfil | `PUT /usuarios/me` | objeto com `nome`, `email`, `telefone` |
| Criar solicitação pública | `POST /solicitacoes` | dados de solicitação sem `id/status/createdAt` |
| Listar solicitações no painel | `GET /solicitacoes` | array de solicitações |
| Aprovar solicitação | `POST /solicitacoes/:id/aprovar` | `{ "location": "Local da obra" }` (proposta) |
| Recusar solicitação | `POST /solicitacoes/:id/recusar` | corpo vazio (proposta) |
| Listar alocações | `GET /alocacoes` | array de alocações |
| Criar alocação | `POST /alocacoes` | dados de alocação sem `id/status/createdAt` |
| Editar alocação | `PUT /alocacoes/:id` | dados editáveis de alocação |
| Encerrar alocação | `POST /alocacoes/:id/encerrar` | corpo vazio (proposta) |
| Entrar no painel | `POST /auth/login` | `{ "email": "...", "password": "..." }` (proposta) |
| Sair do painel | `POST /auth/logout` | corpo vazio (proposta) |

**Formato de resposta recomendado para compatibilidade inicial:** `GET /maquinas` retorna diretamente `[{...},{...}]`, `GET /solicitacoes` retorna `[{...}]`, `GET /alocacoes` retorna `[{...}]` e `GET /empresas/me` retorna `{...}`. Se a equipe usar `{ "data": [...] }`, adaptar o `api.js` antes de integrar.

**Erros (proposta):** utilizar códigos HTTP adequados (`400` validação, `401` não autenticado, `403` sem permissão, `404` não encontrado, `409` conflito de disponibilidade, `500` erro interno) e JSON, por exemplo:

```json
{
  "error": {
    "code": "CAPACITY_UNAVAILABLE",
    "message": "Não há unidades suficientes no período solicitado."
  }
}
```

**Autenticação e CORS:** definir se a sessão usará cookies HTTP-only ou outro mecanismo. Para cookies cross-origin, configurar `credentials: "include"`, CORS com origem explícita, e opções de cookie coerentes com o ambiente. Não habilitar origem `*` com credenciais.

## 9. Mapeamento rápido JSON ↔ PostgreSQL

| Entidade | Frontend | PostgreSQL |
|---|---|---|
| Empresa | `name`, `description`, `city`, `state` | `nome`, `descricao`, `cidade`, `estado` |
| Empresa | `brand`, `logo` | `cor_principal`, `logo_url` |
| Máquina | `machineId` em outras entidades | `maquina_id` nas tabelas relacionadas |
| Máquina | `name`, `category`, `brand`, `model`, `purpose`, `description` | `nome`, `categoria`, `marca`, `modelo`, `finalidade`, `descricao` |
| Máquina | `origin`, `partner`, `quantity`, `maintenanceQty` | `origem`, `nome_parceiro`, `quantidade_total`, `quantidade_manutencao` |
| Solicitação | `name`, `phone`, `location` | `nome_cliente`, `telefone_cliente`, `local_servico` |
| Solicitação | `start`, `end`, `createdAt` | `data_inicio`, `data_fim`, `criado_em` |
| Alocação | `customer`, `location`, `quantity` | `nome_cliente`, `local_servico`, `quantidade` |
| Alocação | `requestId`, `start`, `end` | `solicitacao_id`, `data_inicio`, `data_fim` |
| Perfil | `nome`, `email`, `telefone` | `usuarios.nome`, `usuarios.email`, `usuarios.telefone` |

## 10. ⚠ Pontos a decidir com Antônio Pedro

- [ ] **Status de solicitações:** adotar `aprovado/recusado` na API (mapeando `aprovada/recusada` do banco) ou padronizar o sistema inteiro.
- [ ] **IDs:** usar string no JSON para compatibilidade com a comparação estrita do Frontend, mesmo que o SQL use BIGINT.
- [ ] **Campos ausentes do SQL:** `empresas.tagline`, `address`, `email`; `maquinas.type`, `partnerContact`; `alocacoes.contact`, `endedAt`; `solicitacoes.decidedAt`. Decidir incluir, derivar ou retirar da interface.
- [ ] **Imagens:** definir se `image` será slug dos SVGs ou URL armazenada em `imagem_url`; definir fluxo de upload de logo em vez de Data URL persistida.
- [ ] **Categorias:** preservar acentos e nomes usados pelo catálogo, ou definir transformação padronizada.
- [ ] **Disponibilidade:** calcular e revalidar no Backend em transação; solicitações pendentes não bloqueiam unidades.
- [ ] **Autenticação:** escolher estratégia de sessão, CORS e permissões; remover login demonstrativo na integração real.
- [ ] **Rotas:** confirmar endpoints, formato de resposta (`array` direto versus `{data}`), códigos de erro e filtros.
- [ ] **Origem única:** com a API ativa, evitar manter `localStorage` como fonte de verdade para empresa, máquinas, solicitações e alocações.

---

### Mensagem curta para o Backend

> Pedro, organizei neste arquivo todos os **campos de dados dos formulários e objetos** que o Frontend do Alloc Link espera. As tabelas mostram nomes JSON, tipos, validações e colunas equivalentes do PostgreSQL. As rotas são sugestões para alinharmos antes de integrar. Principalmente, precisamos definir o mapeamento de status (`aprovado`/`aprovada`), os campos que faltam no SQL e o formato dos IDs.

**Nota de manutenção:** sempre que uma tela mudar um nome de campo, atualize este documento junto com a alteração. Esse arquivo é um **contrato proposto**, não um gerador automático de tipos nem uma migração SQL.
