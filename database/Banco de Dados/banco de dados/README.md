# Alloc Link — Banco PostgreSQL: versão inicial

Este é um **ponto de partida**, e não o banco definitivo do MVP. A estrutura foi reduzida para facilitar o início do desenvolvimento e o aprendizado.

## Tabelas

| Tabela | Para que serve |
|---|---|
| `empresas` | Dados da empresa, logo e cor principal do portal. |
| `maquinas` | Catálogo: nome, categoria, marca, modelo, finalidade, imagem, quantidades e máquinas de terceiros. |
| `solicitacoes` | Pedidos feitos pelo cliente sem criar conta; inicialmente pendentes. |
| `alocacoes` | Aluguéis aprovados ou cadastrados pelo administrador, com períodos e quantidades. |

## Como executar no pgAdmin 4

1. Conecte-se ao servidor PostgreSQL. Abra o banco `postgres` e **Query Tool**; execute `00_criar_banco.sql` (somente se ainda não houver banco `alloc_link`).
2. Na árvore do pgAdmin, atualize a lista de bancos. Selecione **alloc_link** e abra seu **Query Tool**.
3. Execute `01_estrutura_inicial.sql` para criar as tabelas.
4. Execute `02_dados_de_exemplo.sql` para inserir máquinas fictícias e um pedido/alocação de teste.
5. Execute `03_consultas_de_teste.sql` para conferir se o catálogo, os pedidos e a disponibilidade funcionam.

**Importante:** execute cada arquivo de criação e dados **uma vez**. Se executar novamente, aparecerão erros de tabelas existentes ou dados duplicados. Não apague um banco com dados reais para reiniciar os testes.

## Como a disponibilidade é calculada

Disponível no período = quantidade total − manutenção − maior quantidade de unidades ocupadas simultaneamente em qualquer dia do intervalo.

Solicitações **pendentes** não ocupam máquinas; apenas alocações **ativas** ocupam. Uma mesma categoria pode conter diferentes modelos e marcas; se forem diferentes, devem ter registros separados.

## Fora desta primeira versão

- `usuarios` e autenticação segura: devem ser adicionados com o Backend (não armazene senhas em texto puro);
- tabela `parceiros` com cadastro completo: por enquanto o nome do proprietário fica em `maquinas.nome_parceiro`;
- controle individual por número de série/chassi;
- multiempresa simultânea e isolamento entre clientes;
- integração real com WhatsApp e envio automático de mensagens.

## Sobre os dados fictícios

Todos os dados de demonstração (inclusive marcas, modelos e quantidades) são **exemplos**, não inventário confirmado da empresa. Substitua-os depois da validação com a locadora.

## Ponto importante para o Backend

A consulta de disponibilidade serve para testes, mas não garante sozinha que duas aprovações simultâneas não excedam o estoque. Ao aprovar, o Backend deve iniciar transação, bloquear o registro da máquina com `SELECT ... FOR UPDATE`, recalcular disponibilidade e só então inserir a alocação e mudar o status da solicitação antes de fazer `COMMIT`.

Até conectar as APIs e o Frontend ao PostgreSQL, os dados do protótipo em HTML/JS continuarão locais no navegador; o script SQL não substitui automaticamente esse armazenamento.
