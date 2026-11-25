-- PED-08 | Compatibilidade para bancos já criados antes da implementação de terceiros.
BEGIN;

ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS contato_parceiro VARCHAR(255);

-- Registros antigos de terceiros não tinham contato; preserva-os com marcador
-- para que a nova restrição possa ser aplicada e o administrador possa corrigir depois.
UPDATE maquinas
   SET contato_parceiro = 'Não informado'
 WHERE origem = 'terceiros'
   AND NULLIF(TRIM(contato_parceiro), '') IS NULL;

ALTER TABLE maquinas DROP CONSTRAINT IF EXISTS ck_maquinas_qtd;
ALTER TABLE maquinas ADD CONSTRAINT ck_maquinas_qtd CHECK (
    quantidade_total >= 0
    AND quantidade_manutencao >= 0
    AND quantidade_manutencao <= quantidade_total
);

ALTER TABLE maquinas DROP CONSTRAINT IF EXISTS ck_maquinas_origem;
ALTER TABLE maquinas ADD CONSTRAINT ck_maquinas_origem CHECK (
    (origem = 'propria' AND nome_parceiro IS NULL AND contato_parceiro IS NULL) OR
    (origem = 'terceiros' AND NULLIF(TRIM(nome_parceiro), '') IS NOT NULL
     AND NULLIF(TRIM(contato_parceiro), '') IS NOT NULL)
);

COMMIT;
