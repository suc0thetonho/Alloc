# Especificação dos Endpoints da API — Alloc (MVP)

> **Documento de Referência:** Issue [#14 (PED-02)](https://github.com/suc0thetonho/Alloc/issues/14)  
> **Responsável:** Antônio Pedro  
> **Alinhamento:** Samuel Oliveira ([SAM-01](https://github.com/suc0thetonho/Alloc/issues/5), [SAM-03](https://github.com/suc0thetonho/Alloc/issues/7), [SAM-04](https://github.com/suc0thetonho/Alloc/issues/8))  
> **Versão da API:** `v1` (`/api/v1`)  

---

## 📌 Sumário Executivo

Este documento estabelece o contrato oficial da API RESTful para o MVP do sistema **Alloc**. Define as rotas públicas (catálogo e solicitação de locação por clientes) e protegidas (painel do administrador para gestão de máquinas, estoque, parceiros, aprovação de pedidos e alocações).

---

## 📐 Padrões e Convenções

### 1. Formato de Resposta (Envelope Padronizado)

Todas as respostas HTTP utilizam o formato JSON sob um envelope uniforme:

#### Resposta de Sucesso:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

#### Resposta de Erro:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Máquina solicitada não foi encontrada.",
    "details": []
  }
}
```

### 2. Códigos HTTP Utilizados

| Código | Significado | Quando é utilizado |
| :--- | :--- | :--- |
| `200 OK` | Sucesso | Consultas (`GET`), atualizações parciais (`PATCH`) ou operações síncronas |
| `201 Created` | Criado | Criação de novos recursos (`POST`) |
| `204 No Content` | Sem Conteúdo | Exclusão de recursos (`DELETE`) |
| `400 Bad Request` | Requisição Inválida | Sintaxe inválida ou regras de negócio violadas |
| `401 Unauthorized` | Não Autenticado | Token JWT ausente, expirado ou inválido |
| `403 Forbidden` | Não Autorizado | Usuário autenticado não tem permissão de administrador |
| `404 Not Found` | Não Encontrado | Recurso não existe |
| `409 Conflict` | Conflito | Tentativa de alocação sem estoque disponível ou duplicidade |
| `422 Unprocessable Entity` | Erro de Validação | Falha na validação de campos obrigatórios do payload |
| `500 Internal Error` | Erro no Servidor | Falha inesperada do servidor |

### 3. Autenticação e Permissões
- **Público (`PUBLIC`):** Não exige autenticação. Acesso livre a visitantes e clientes.
- **Administrador (`ADMIN`):** Exige cabeçalho HTTP:
  ```http
  Authorization: Bearer <jwt_token>
  ```

### 4. Padrão de Datas
- Todas as datas seguem a norma ISO 8601:
  - Formato simples: `YYYY-MM-DD` (ex: `2026-11-10`)
  - Formato com horário: `YYYY-MM-DDTHH:mm:ss.sssZ` (ex: `2026-11-10T14:30:00.000Z`)

---

## 🌐 1. Endpoints Públicos (Clientes e Visitantes)

### 1.1 Consultar Dados da Empresa
- **Método / Rota:** `GET /api/v1/company`
- **Permissão:** `PUBLIC`
- **Finalidade:** Retorna os dados institucionais, identidade visual, contatos e WhatsApp para atendimento.
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "emp_01h8q...",
    "name": "Locadora de Equipamentos Forte",
    "logoUrl": "https://cdn.alloc.com/logos/emp-forte.png",
    "primaryColor": "#0F52BA",
    "secondaryColor": "#F4A261",
    "phone": "+55 11 98765-4321",
    "whatsapp": "5511987654321",
    "email": "contato@locadoraforte.com.br",
    "address": {
      "street": "Av. das Indústrias, 1500",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "04567-000"
    }
  }
}
```

---

### 1.2 Catálogo Público de Máquinas
- **Método / Rota:** `GET /api/v1/machines`
- **Permissão:** `PUBLIC`
- **Finalidade:** Listar equipamentos disponíveis para locação com suporte a filtros e busca.
- **Query Parameters:**
  - `search` *(opcional, string)*: busca textual em nome, modelo, marca ou finalidade.
  - `type` *(opcional, string)*: categoria (ex: `compactador`, `gerador`, `betoneira`, `plataforma`).
  - `page` *(opcional, integer, default: 1)*
  - `limit` *(opcional, integer, default: 12)*
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mac_01jk98...",
      "name": "Compactador de Solo a Percussão",
      "type": "compactador",
      "brand": "Wacker Neuson",
      "model": "BS 50-2",
      "purpose": "Compactação de valas, fundações e leitos de tubulações em obras civis",
      "applications": [
        "Compactação de solos coesivos e mistos",
        "Obras de saneamento e tubulações",
        "Valas estreitas e fundações"
      ],
      "imageUrl": "https://cdn.alloc.com/machines/compactador-bs50.jpg",
      "totalUnits": 5,
      "availableNow": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 1
  }
}
```

---

### 1.3 Detalhes da Máquina
- **Método / Rota:** `GET /api/v1/machines/:id`
- **Permissão:** `PUBLIC`
- **Finalidade:** Exibir ficha técnica completa, fotos e especificações para a página do produto.
- **Parâmetros de Rota:** `id` *(string, obrigatório)*
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "mac_01jk98...",
    "name": "Compactador de Solo a Percussão",
    "type": "compactador",
    "brand": "Wacker Neuson",
    "model": "BS 50-2",
    "purpose": "Compactação de solos coesivos, valas e bases para pavimentação",
    "description": "Equipamento robusto com motor 2 tempos, excelente ergonomia e alto poder de impacto.",
    "applications": [
      "Compactação de solos coesivos e mistos",
      "Obras de saneamento e redes subterrâneas",
      "Bases de piso e fundações estreitas"
    ],
    "specifications": {
      "weightKg": 59,
      "fuel": "Gasolina",
      "blowsPerMinute": 700,
      "shoeWidthMm": 280
    },
    "images": [
      "https://cdn.alloc.com/machines/compactador-bs50-front.jpg",
      "https://cdn.alloc.com/machines/compactador-bs50-side.jpg"
    ],
    "originType": "OWN",
    "availableNow": true
  }
}
```

---

### 1.4 Consulta de Disponibilidade por Intervalo
- **Método / Rota:** `GET /api/v1/machines/:id/availability`
- **Permissão:** `PUBLIC`
- **Finalidade:** Permite ao cliente verificar se há máquinas livres no período pretendido antes de enviar o pedido.
- **Query Parameters:**
  - `startDate` *(string, ISO 8601, obrigatório)*: Ex: `2026-11-10`
  - `endDate` *(string, ISO 8601, obrigatório)*: Ex: `2026-11-15`
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "machineId": "mac_01jk98...",
    "period": {
      "startDate": "2026-11-10",
      "endDate": "2026-11-15"
    },
    "totalUnits": 5,
    "underMaintenance": 1,
    "maxAllocatedInPeriod": 2,
    "availableQuantity": 2,
    "isAvailable": true
  }
}
```

---

### 1.5 Solicitar Locação de Máquinas (Pedido sem Login)
- **Método / Rota:** `POST /api/v1/orders`
- **Permissão:** `PUBLIC`
- **Finalidade:** Formulário público preenchido pelo cliente para solicitar orçamento/locação.  
  *(Nota alinhada com SAM-01: O pedido pendente **não** reserva o equipamento de imediato. A aprovação é manual pelo administrador).*
- **Payload de Entrada:**
```json
{
  "customer": {
    "name": "Engenharia Santos & Filhos",
    "phone": "11999998888",
    "email": "contato@santoseng.com.br"
  },
  "items": [
    {
      "machineId": "mac_01jk98...",
      "quantity": 2
    }
  ],
  "period": {
    "startDate": "2026-11-10",
    "endDate": "2026-11-17"
  },
  "deliveryLocation": {
    "address": "Rua das Obras, 420 - Galpão 3",
    "city": "Campinas",
    "state": "SP",
    "notes": "Entrada de carga pesada pela portaria 2"
  },
  "notes": "Precisamos com urgência no primeiro horário da manhã."
}
```
- **Resposta `201 Created`:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_01h8z...",
    "status": "PENDING",
    "createdAt": "2026-11-01T16:30:00.000Z",
    "message": "Solicitação enviada com sucesso! Nossa equipe entrará em contato via WhatsApp para confirmar a locação."
  }
}
```

---

## 🔒 2. Endpoints Protegidos (Administração / Locadora)

### 2.1 Autenticação do Administrador
#### Login
- **Método / Rota:** `POST /api/v1/auth/login`
- **Permissão:** `PUBLIC`
- **Payload:**
```json
{
  "email": "admin@locadoraforte.com.br",
  "password": "SenhaSegura123!"
}
```
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "usr_01jk1...",
      "name": "Administrador Principal",
      "email": "admin@locadoraforte.com.br",
      "role": "ADMIN"
    }
  }
}
```

#### Perfil do Usuário Autenticado
- **Método / Rota:** `GET /api/v1/auth/me`
- **Permissão:** `ADMIN`

---

### 2.2 Gerenciamento da Empresa
- **Método / Rota:** `PATCH /api/v1/company`
- **Permissão:** `ADMIN`
- **Finalidade:** Atualizar dados, contato, WhatsApp e cores institucionais da empresa.
- **Payload de Entrada (Campos opcionais):**
```json
{
  "name": "Locadora de Equipamentos Forte Ltda",
  "phone": "+55 11 98765-4321",
  "whatsapp": "5511987654321",
  "primaryColor": "#0F52BA"
}
```

---

### 2.3 Gestão de Máquinas e Equipamentos
#### Cadastrar Máquina
- **Método / Rota:** `POST /api/v1/admin/machines`
- **Permissão:** `ADMIN`
- **Finalidade:** Cadastrar um novo equipamento, especificando se é próprio ou de parceiro terceirizado.
- **Payload:**
```json
{
  "name": "Plataforma Articulada Elétrica 15m",
  "type": "plataforma",
  "brand": "Genie",
  "model": "Z-45/25J DC",
  "purpose": "Trabalho em altura em galpões industriais e manutenção predial",
  "description": "Alcance vertical de 15,87m com emissão zero e baixo ruído.",
  "applications": [
    "Instalações elétricas industriais",
    "Pintura e manutenção em áreas internas",
    "Manutenção predial e galpões"
  ],
  "totalUnits": 2,
  "maintenanceUnits": 0,
  "originType": "PARTNER",
  "partnerId": "part_01h9y...",
  "images": [
    "https://cdn.alloc.com/machines/genie-z45.jpg"
  ]
}
```
- **Resposta `201 Created`**

#### Atualizar Máquina
- **Método / Rota:** `PUT /api/v1/admin/machines/:id`
- **Permissão:** `ADMIN`

#### Atualizar Status ou Unidades em Manutenção
- **Método / Rota:** `PATCH /api/v1/admin/machines/:id/maintenance`
- **Permissão:** `ADMIN`
- **Payload:**
```json
{
  "maintenanceUnits": 1,
  "notes": "Uma unidade enviada para revisão preventiva da bomba hidráulica."
}
```

#### Excluir / Inativar Máquina
- **Método / Rota:** `DELETE /api/v1/admin/machines/:id`
- **Permissão:** `ADMIN`
- **Resposta `204 No Content`**

---

### 2.4 Gestão de Parceiros (Proprietários Terceirizados)
- `GET /api/v1/admin/partners` (`ADMIN`): Lista parceiros cadastrados.
- `POST /api/v1/admin/partners` (`ADMIN`): Cadastra novo parceiro (nome, razão social, documento, telefone, email, chave Pix/dados de repasse).

---

### 2.5 Gestão de Pedidos e Solicitações

#### Listar Solicitações
- **Método / Rota:** `GET /api/v1/admin/orders`
- **Permissão:** `ADMIN`
- **Query Parameters:**
  - `status`: `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED`
  - `startDate`, `endDate`: filtro por período pretendido.
  - `page`, `limit`

#### Detalhe da Solicitação com Verificação de Estoque
- **Método / Rota:** `GET /api/v1/admin/orders/:id`
- **Permissão:** `ADMIN`
- **Resposta `200 OK`:** Retorna todos os dados do pedido e o cálculo em tempo real se ainda há estoque suficiente para aprovar no período.

#### Aprovar Solicitação (Gerar Alocação)
- **Método / Rota:** `PATCH /api/v1/admin/orders/:id/approve`
- **Permissão:** `ADMIN`
- **Finalidade:** Valida a disponibilidade no período. Se disponível, confirma a alocação de estoque, marca o pedido como `APPROVED` e gera o link/texto pré-formatado para envio de confirmação via WhatsApp.
- **Payload:**
```json
{
  "notes": "Cliente regular aprovado sem caução prévia."
}
```
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_01h8z...",
    "status": "APPROVED",
    "allocationId": "alloc_01jk5...",
    "whatsappNotification": {
      "targetPhone": "5511999998888",
      "message": "Olá Engenharia Santos & Filhos! Sua solicitação de locação para 2x Compactador de Solo a Percussão (10/11/2026 a 17/11/2026) foi APROVADA pela Locadora Forte. Em breve combinaremos os detalhes de entrega.",
      "directLink": "https://wa.me/5511999998888?text=Ol%C3%A1%20Engenharia%20Santos..."
    }
  }
}
```

#### Recusar Solicitação
- **Método / Rota:** `PATCH /api/v1/admin/orders/:id/reject`
- **Permissão:** `ADMIN`
- **Payload:**
```json
{
  "reason": "Sem estoque disponível para o período solicitado."
}
```
- **Resposta `200 OK`:** Retorna o status `REJECTED` e texto sugerido para aviso via WhatsApp ao cliente com motivo da recusa.

---

### 2.6 Gestão de Alocações e Calendário de Disponibilidade

#### Listar Alocações Ativas e Histórico
- **Método / Rota:** `GET /api/v1/admin/allocations`
- **Permissão:** `ADMIN`
- **Query Parameters:**
  - `machineId` *(opcional)*
  - `startDate`, `endDate` *(opcional)*
  - `status`: `SCHEDULED` | `ACTIVE` | `COMPLETED` | `CANCELLED`

#### Matriz de Disponibilidade por Máquina
- **Método / Rota:** `GET /api/v1/admin/machines/:id/availability-matrix`
- **Permissão:** `ADMIN`
- **Finalidade:** Permite ao administrador visualizar dia a dia a ocupação do equipamento.
- **Fórmula de Cálculo:**
  $$\text{Disponível}(t) = \text{Total} - \text{Em Manutenção} - \sum \text{Alocações Ativas em } t$$
- **Resposta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "machineId": "mac_01jk98...",
    "name": "Compactador de Solo a Percussão",
    "totalUnits": 5,
    "maintenanceUnits": 1,
    "calendar": [
      {
        "date": "2026-11-10",
        "allocatedUnits": 2,
        "availableUnits": 2
      },
      {
        "date": "2026-11-11",
        "allocatedUnits": 3,
        "availableUnits": 1
      }
    ]
  }
}
```

#### Concluir / Devolver Alocação
- **Método / Rota:** `PATCH /api/v1/admin/allocations/:id/return`
- **Permissão:** `ADMIN`
- **Finalidade:** Registra a devolução do equipamento liberando o estoque.

---

## 📋 3. Matriz Resumo dos Endpoints

| Método | Endpoint | Permissão | Finalidade |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/company` | `PUBLIC` | Consulta dados cadastrais da empresa e contatos |
| `PATCH` | `/api/v1/company` | `ADMIN` | Atualiza configurações e dados da empresa |
| `GET` | `/api/v1/machines` | `PUBLIC` | Catálogo público com filtros e paginação |
| `GET` | `/api/v1/machines/:id` | `PUBLIC` | Ficha técnica e especificações do equipamento |
| `GET` | `/api/v1/machines/:id/availability` | `PUBLIC` | Consulta de estoque disponível no período |
| `POST` | `/api/v1/orders` | `PUBLIC` | Envio de solicitação de locação pelo cliente |
| `POST` | `/api/v1/auth/login` | `PUBLIC` | Autenticação do administrador (JWT) |
| `GET` | `/api/v1/auth/me` | `ADMIN` | Dados do usuário autenticado |
| `POST` | `/api/v1/admin/machines` | `ADMIN` | Cadastro de novas máquinas e equipamentos |
| `PUT` | `/api/v1/admin/machines/:id` | `ADMIN` | Atualização completa de máquina |
| `PATCH` | `/api/v1/admin/machines/:id/maintenance` | `ADMIN` | Atualiza unidades em manutenção |
| `DELETE` | `/api/v1/admin/machines/:id` | `ADMIN` | Exclusão / inativação de máquina |
| `GET` | `/api/v1/admin/partners` | `ADMIN` | Listagem de parceiros/proprietários de terceiros |
| `POST` | `/api/v1/admin/partners` | `ADMIN` | Cadastro de parceiro de equipamento terceirizado |
| `GET` | `/api/v1/admin/orders` | `ADMIN` | Listagem de pedidos com filtros de status |
| `GET` | `/api/v1/admin/orders/:id` | `ADMIN` | Detalhes do pedido e conferência de disponibilidade |
| `PATCH` | `/api/v1/admin/orders/:id/approve` | `ADMIN` | Aprova pedido, aloca estoque e gera msg WhatsApp |
| `PATCH` | `/api/v1/admin/orders/:id/reject` | `ADMIN` | Recusa pedido e gera texto de aviso ao cliente |
| `GET` | `/api/v1/admin/allocations` | `ADMIN` | Listagem e acompanhamento das alocações |
| `GET` | `/api/v1/admin/machines/:id/availability-matrix` | `ADMIN` | Matriz diária de ocupação e estoque livre |
| `PATCH` | `/api/v1/admin/allocations/:id/return` | `ADMIN` | Conclusão e devolução de equipamentos alocados |

---

## 🤝 4. Alinhamento com o Modelo de Dados (Samuel - SAM-03 e SAM-04)

Os campos deste contrato foram compatibilizados com as entidades modeladas para o MVP:

1. **`Company`**: `id`, `name`, `logo_url`, `primary_color`, `secondary_color`, `phone`, `whatsapp`, `email`, `address`.
2. **`User` (Admin)**: `id`, `name`, `email`, `password_hash`, `role`.
3. **`Partner`**: `id`, `name`, `document`, `phone`, `email`, `notes`.
4. **`Machine`**: `id`, `name`, `type`, `brand`, `model`, `purpose`, `description`, `applications`, `specifications`, `image_url`, `total_units`, `maintenance_units`, `origin_type` (`OWN` ou `PARTNER`), `partner_id`.
5. **`Order` (Solicitação)**: `id`, `customer_name`, `customer_phone`, `customer_email`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `start_date`, `end_date`, `delivery_address`, `rejection_reason`.
6. **`OrderItem`**: `id`, `order_id`, `machine_id`, `quantity`.
7. **`Allocation`**: `id`, `order_id`, `machine_id`, `quantity`, `start_date`, `end_date`, `status` (`ACTIVE`, `COMPLETED`, `CANCELLED`).

