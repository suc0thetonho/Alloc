# Alloc — Backend API

Serviço de backend e API RESTful do projeto **Alloc**, desenvolvido em **Node.js** com **TypeScript** e **Express**.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime:** Node.js (v20+)
- **Linguagem:** TypeScript
- **Framework Web:** Express
- **Configuração de Ambiente:** Dotenv
- **Banco de Dados:** PostgreSQL via `pg` e pool de conexões
- **Segurança & CORS:** CORS
- **Testes Automatizados:** Vitest + Supertest
- **Execução em Desenvolvimento:** tsx (hot-reload)

---

## 📂 Estrutura de Diretórios

```
backend/
├── src/
│   ├── config/             # Configurações globais e carregamento de variáveis de ambiente
│   │   └── env.ts
│   ├── controllers/        # Controladores com regras de requisição e resposta
│   │   └── health.controller.ts
│   ├── routes/             # Definição e agrupamento de rotas
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── app.ts              # Configuração da aplicação Express (middlewares e rotas)
│   └── server.ts           # Inicialização do servidor HTTP e listener de porta
├── tests/                  # Testes automatizados (integração e unitários)
│   └── health.test.ts
├── .env.example            # Exemplo de configuração de variáveis de ambiente
├── .gitignore              # Arquivos ignorados pelo Git (node_modules, .env, dist)
├── package.json            # Metadados, scripts e dependências do projeto
├── tsconfig.json           # Configurações do compilador TypeScript
└── README.md               # Esta documentação
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** instalado (versão 20 ou superior recomendada)
- Gerenciador de pacotes **npm**

### 1. Acessar o diretório
```bash
cd backend
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` a partir do modelo `.env.example`:
```bash
# No Windows PowerShell:
Copy-Item .env.example .env

# No Linux/macOS/Git Bash:
cp .env.example .env
```

Configurações disponíveis:
| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta em que o servidor irá escutar |
| `NODE_ENV` | `development` | Ambiente (`development`, `production`, `test`) |
| `CORS_ORIGIN` | `*` | Origens permitidas para requisições cross-origin |
| `DATABASE_URL` | — | URL de conexão do PostgreSQL, obrigatória para os comandos do banco |
| `DB_POOL_MAX` | `10` | Limite de conexões simultâneas do pool |

> ⚠️ **Atenção:** O arquivo `.env` contém credenciais e configurações locais e **nunca deve ser versionado no Git**.

### 4. Preparar o banco de dados

O banco utilizado pelo projeto é PostgreSQL. Crie o banco `alloc_link` executando
`database/Banco de Dados/banco de dados/00_criar_banco.sql` no banco de manutenção
`postgres`. Depois de configurar `DATABASE_URL`, aplique o esquema inicial com:

```bash
npm run db:migrate
```

Para executar a consulta de persistência usada como teste de conexão:

```bash
npm run db:test
```

O backend também disponibiliza `GET /api/database/health`, que executa `SELECT 1` e
retorna `200` quando o banco está acessível ou `503` quando a conexão falha.

### 5. Executar em modo de desenvolvimento
Inicia o servidor com hot-reload automático a cada alteração de código:
```bash
npm run dev
```

O servidor estará disponível em: `http://localhost:3000`

---

## 📑 Especificação Completa da API

A documentação detalhada de todos os endpoints do MVP (públicos e administrativos), contratos de requisição/resposta, matriz de permissões e regras de negócio está disponível em:
👉 **[Especificação dos Endpoints do MVP](../docs/api/endpoints-mvp.md)**

---

## 📡 Endpoints Disponíveis

### Catálogo de Máquinas

`GET /api/v1/machines` lista as máquinas ativas para o catálogo público.

Parâmetros opcionais: `search`, `type`, `page` e `limit` (padrão `page=1` e
`limit=12`). A resposta informa origem, total de unidades, unidades em
manutenção, unidades disponíveis e `availableNow`.

Exemplo:

```bash
curl "http://localhost:3000/api/v1/machines?type=retroescavadeira"
```

Quando não há registros, a API retorna `200` com `data: []` e `meta.total: 0`.

### Verificação de Saúde (Health Check)
Verifica se o backend está ativo e respondendo adequadamente.

- **URL:** `GET /health` ou `GET /api/health`
- **Exemplo de Resposta HTTP (Status 200 OK):**
```json
{
  "status": "ok",
  "message": "Backend está saudável e operante.",
  "timestamp": "2026-11-01T16:16:40.525Z",
  "uptime": 1.5729503,
  "environment": "development"
}
```

---

## 🧪 Testes Automatizados

Para executar os testes com o **Vitest**:
```bash
# Execução única:
npm test

# Modo interativo (watch):
npm run test:watch
```

---

## 📦 Build para Produção

Para compilar o código TypeScript para JavaScript puro na pasta `dist/`:
```bash
npm run build
```

Para iniciar o servidor a partir do build de produção:
```bash
npm start
```

