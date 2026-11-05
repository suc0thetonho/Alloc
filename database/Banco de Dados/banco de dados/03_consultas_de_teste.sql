-- ALLOC LINK | Passo 3: consultas simples para conferir o funcionamento.

-- 1) Ver as maquinas cadastradas e sua capacidade (sem olhar datas).
SELECT id, nome, categoria, marca, modelo, quantidade_total,
       quantidade_manutencao,
       quantidade_total - quantidade_manutencao AS capacidade_operacional
FROM maquinas
ORDER BY id;

-- 2) Ver os pedidos que o administrador devera analisar.
SELECT s.id, s.nome_cliente, m.nome AS maquina, s.quantidade,
       s.data_inicio, s.data_fim, s.status
FROM solicitacoes s
JOIN maquinas m ON m.id = s.maquina_id
ORDER BY s.id;

-- 3) Calcular quantas unidades sobram DURANTE TODO O PERIODO.
-- Exemplo: se a retroescavadeira tem 3 unidades, 1 em manutencao e
-- 1 alocada nas datas 10 a 12/11/2026, sobram 1 unidade nesse intervalo.
-- Altere o id da maquina e as datas para experimentar.
WITH parametros AS (
    SELECT (SELECT id FROM maquinas WHERE nome = 'Retroescavadeira'
            ORDER BY id LIMIT 1) AS maquina_id,
           DATE '2026-11-10' AS inicio,
           DATE '2026-11-12' AS fim
),
dias AS (
    SELECT g.dia::DATE AS dia
    FROM parametros p,
         generate_series(p.inicio, p.fim, INTERVAL '1 day') AS g(dia)
),
ocupacao AS (
    SELECT dias.dia, COALESCE(SUM(a.quantidade), 0) AS ocupadas
    FROM dias CROSS JOIN parametros p
    LEFT JOIN alocacoes a
        ON a.maquina_id = p.maquina_id
       AND a.status = 'ativa'
       AND a.data_inicio <= dias.dia
       AND a.data_fim >= dias.dia
    GROUP BY dias.dia
)
SELECT m.id, m.nome, m.quantidade_total, m.quantidade_manutencao,
       COALESCE((SELECT MAX(ocupadas) FROM ocupacao), 0) AS pico_alocadas_no_periodo,
       GREATEST(0, m.quantidade_total - m.quantidade_manutencao
                 - COALESCE((SELECT MAX(ocupadas) FROM ocupacao), 0))
           AS unidades_disponiveis_no_periodo
FROM maquinas m
CROSS JOIN parametros p
WHERE m.id = p.maquina_id;

-- IMPORTANTE: isto é uma consulta demonstrativa.
-- O Backend deve validar disponibilidade e aprovar pedidos na MESMA transacao,
-- bloqueando a linha da maquina (SELECT ... FOR UPDATE) antes de registrar
-- uma alocacao. Somente consultar antes do INSERT nao impede concorrencia.
