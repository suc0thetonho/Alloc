-- ==============================================================
-- ALLOC LINK | Banco inicial PostgreSQL - versão enxuta
-- ==============================================================
-- Execute UMA VEZ em um banco vazio chamado alloc_link.
-- 4 tabelas: empresas, maquinas, solicitacoes, alocacoes.
-- Futuramente: usuarios (autenticacao), parceiros (cadastro completo),
-- unidades fisicas, trilha de auditoria, etc.

BEGIN;

CREATE TABLE empresas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    telefone VARCHAR(25),
    whatsapp VARCHAR(25),
    cidade VARCHAR(100),
    estado CHAR(2),
    logo_url TEXT,
    cor_principal CHAR(7) NOT NULL DEFAULT '#176B43',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_empresa_cor CHECK (cor_principal ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE maquinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES empresas(id),
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(80) NOT NULL,
    finalidade TEXT NOT NULL,
    descricao TEXT,
    imagem_url TEXT,
    origem VARCHAR(12) NOT NULL DEFAULT 'propria',
    nome_parceiro VARCHAR(120),
    quantidade_total INTEGER NOT NULL DEFAULT 1,
    quantidade_manutencao INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_maquinas_qtd CHECK (
       quantidade_total > 0
       AND quantidade_manutencao >= 0
       AND quantidade_manutencao <= quantidade_total
    ),
    CONSTRAINT ck_maquinas_origem CHECK (
        (origem = 'propria' AND nome_parceiro IS NULL) OR
        (origem = 'terceiros' AND NULLIF(TRIM(nome_parceiro), '') IS NOT NULL)
    )
);

CREATE TABLE solicitacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maquina_id BIGINT NOT NULL REFERENCES maquinas(id),
    nome_cliente VARCHAR(120) NOT NULL,
    telefone_cliente VARCHAR(25) NOT NULL,
    local_servico VARCHAR(160), -- opcional como no prototipo
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(12) NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_solicitacoes_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_solicitacoes_qtd CHECK (quantidade > 0),
    CONSTRAINT ck_solicitacoes_status CHECK (status IN ('pendente', 'aprovada', 'recusada'))
);

CREATE TABLE alocacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maquina_id BIGINT NOT NULL REFERENCES maquinas(id),
    solicitacao_id BIGINT UNIQUE REFERENCES solicitacoes(id),
    nome_cliente VARCHAR(120) NOT NULL,
    local_servico VARCHAR(160),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(12) NOT NULL DEFAULT 'ativa',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_alocacoes_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_alocacoes_qtd CHECK (quantidade > 0),
    CONSTRAINT ck_alocacoes_status CHECK (status IN ('ativa', 'encerrada', 'cancelada'))
);

CREATE INDEX idx_maquinas_empresa_categoria ON maquinas(empresa_id, categoria);
CREATE INDEX idx_solicitacoes_maquina_status ON solicitacoes(maquina_id, status);
CREATE INDEX idx_alocacoes_ativas_periodo ON alocacoes(maquina_id, data_inicio, data_fim)
    WHERE status = 'ativa';

COMMIT;
