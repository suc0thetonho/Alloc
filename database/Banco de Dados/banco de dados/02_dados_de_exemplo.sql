-- ALLOC LINK | Passo 2: dados inteiramente FICTICIOS para demonstracao.
-- As marcas, modelos e quantidades NAO foram confirmados pela empresa.
-- Execute UMA VEZ apos 01_estrutura_inicial.sql.

BEGIN;

INSERT INTO empresas (nome, descricao, telefone, whatsapp, cidade, estado)
VALUES ('ATC de Sales (DEMONSTRACAO)', 'Locacao de equipamentos para obras e terraplenagem.',
        '(87) 0000-0000', NULL, 'Pesqueira', 'PE');

INSERT INTO maquinas
  (empresa_id, nome, categoria, marca, modelo, finalidade, descricao, imagem_url,
   origem, nome_parceiro, quantidade_total, quantidade_manutencao)
VALUES
  ((SELECT id FROM empresas ORDER BY id LIMIT 1),
   'Retroescavadeira', 'Escavacao', 'JCB', '3CX',
   'Abrir valas, escavar e movimentar materiais.',
   'Indicada para servicos de escavacao e apoio em obras.',
   'assets/retroescavadeira.svg', 'propria', NULL, 3, 1),
  ((SELECT id FROM empresas ORDER BY id LIMIT 1),
   'Trator de Esteira', 'Terraplenagem', 'Caterpillar', 'D6',
   'Preparar terrenos e movimentar grandes volumes de solo.',
   'Indicado para terraplenagem pesada.',
   'assets/trator-esteira.svg', 'propria', NULL, 1, 0),
  ((SELECT id FROM empresas ORDER BY id LIMIT 1),
   'Pa Carregadeira', 'Carga e movimentacao', 'CASE', '621E',
   'Carregar caminhoes e movimentar materiais na obra.',
   'Equipamento parceiro de demonstracao.',
   'assets/pa-carregadeira.svg', 'terceiros', 'Parceiro ficticio', 1, 0),
  ((SELECT id FROM empresas ORDER BY id LIMIT 1),
   'Motoniveladora', 'Nivelamento', 'Komatsu', 'GD555',
   'Nivelar o solo e realizar acabamento de estradas.',
   'Equipamento para regularizacao de superfices.',
   'assets/motoniveladora.svg', 'propria', NULL, 1, 0);

-- Um pedido pendente: NAO reduz disponibilidade.
INSERT INTO solicitacoes
  (maquina_id, nome_cliente, telefone_cliente, local_servico, data_inicio, data_fim, quantidade)
VALUES
  ((SELECT id FROM maquinas WHERE nome='Retroescavadeira' ORDER BY id LIMIT 1),
   'Cliente de teste', '(87) 99999-0000', NULL, DATE '2026-11-10', DATE '2026-11-12', 1);

-- Uma alocacao criada diretamente pelo administrador: reduz a disponibilidade nesse periodo.
INSERT INTO alocacoes
  (maquina_id, solicitacao_id, nome_cliente, local_servico, data_inicio, data_fim, quantidade)
VALUES
  ((SELECT id FROM maquinas WHERE nome='Retroescavadeira' ORDER BY id LIMIT 1),
   NULL, 'Obra de teste', 'Pesqueira/PE', DATE '2026-11-10', DATE '2026-11-12', 1);

COMMIT;
