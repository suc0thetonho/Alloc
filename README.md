# Alloc — Guia do Projeto e Processo

Bem-vindo ao repositório oficial do projeto **Alloc**. Este documento serve como guia para a equipe sobre como utilizamos o GitHub Projects, como o fluxo de trabalho está organizado e quais são os nossos padrões de código.

## 📋 Metodologia: Scrumban

Este projeto utiliza práticas do **Scrumban** (uma adaptação entre Scrum e Kanban). Mantemos a cadência e a organização do Scrum, mas o trabalho flui de forma contínua no board, com **limites de WIP (Work In Progress)** para evitar sobrecarga.

### 🗂️ Como o Board está organizado

O nosso board está dividido nas seguintes colunas:

| Coluna | O que significa | Quem move |
| :--- | :--- | :--- |
| **A fazer** | Backlog do projeto. Tarefas prontas para serem puxadas. | PO (cria) |
| **Em andamento** | Alguém está trabalhando ativamente nisso. | Dev (puxa) |
| **Teste** | A tarefa foi codificada e precisa de validação. | Dev/PO |
| **Concluído** | Entregue e validado. | Automação (ao fechar a issue) |

> ⚠️ **Regra de Ouro (WIP):** Cada pessoa só pode ter **1 tarefa em "Em andamento"** por vez. Se a coluna estiver cheia (limite visual vermelho), ninguém puxa tarefa nova até liberar espaço. Em casos de urgência, o limite pode subir para 2, mas deve ser combinado na daily.

## ✅ Como o PO cria uma tarefa (Issue)

Para que o board funcione e a automação atue, toda tarefa deve ser criada como uma **Issue** no repositório.

1. Vá na aba **Issues** e clique em **New issue**.
2. Dê um título curto e claro (ex: *"Criar tela de login"*).
3. Na descrição, inclua obrigatoriamente:
   - **O que precisa ser feito?** (Contexto)
   - **Critério de Aceite:** Como saberemos que está pronto? (Ex: *"Usuário consegue logar com e-mail e senha"*)
4. Clique em **Submit new issue**.
5. *Mágica:* A automação do GitHub vai jogar essa tarefa direto na coluna **"A fazer"** do nosso board.

> **Atenção:** Se a tarefa não tiver critério de aceite, ela não está pronta para ser puxada.

## 💬 Guia de Commits (Conventional Commits)

Para manter o histórico do Git organizado, legível e profissional, utilizamos o padrão **Conventional Commits**. A estrutura da mensagem deve ser:

`<tipo>(<escopo opcional>): <descrição curta>`

**Exemplos práticos no nosso contexto:**
- `feat: adiciona tela de login`
- `fix: corrige validação de e-mail no cadastro`
- `docs: atualiza instruções do README`
- `refactor: simplifica função de cálculo de frete`

### 🏷️ Tipos de Commit mais usados

| Tipo | Quando usar | Exemplo |
| :--- | :--- | :--- |
| **`feat`** | Nova funcionalidade para o usuário | `feat: adiciona botão de logout` |
| **`fix`** | Correção de um bug | `fix: corrige erro ao salvar formulário` |
| **`docs`** | Mudanças apenas em documentação | `docs: adiciona guia de commits` |
| **`style`** | Formatação, espaços, ponto e vírgula (não muda lógica) | `style: ajusta indentação do arquivo` |
| **`refactor`** | Melhoria no código que não é bug nem feature | `refactor: extrai função de validação` |
| **`test`** | Adição ou correção de testes | `test: adiciona teste unitário para login` |
| **`chore`** | Tarefas de manutenção (build, dependências) | `chore: atualiza versão do Node` |

### 📌 Regras de Ouro para Commits
1. **Use o imperativo:** "adiciona" (e não "adicionado" ou "adicionando").
2. **Seja curto e claro:** A primeira linha deve resumir a mudança (até ~50-72 caracteres).
3. **Sem ponto final** na descrição curta.
4. **Escopo (opcional):** Se a mudança for específica de uma parte, coloque entre parênteses. Ex: `feat(auth): adiciona login com Google`.
5. **Vincular à Issue:** Se o commit resolve uma tarefa do board, referencie a Issue no final. Ex: `fix: corrige erro de renderização (closes #12)`.

## 🔗 Links Úteis

- [📁 Documentação (Google Drive)](https://drive.google.com/drive/folders/1R6l-Ds37L3nQVcgp1DjRTSLbiVdokVp7?usp=sharing)
- [📊 Board do Projeto (GitHub Projects)](https://github.com/users/suc0thetonho/projects/3)

## 📌 Acordos da Equipe

- **Daily:** de segunda a sexta (10 minutos, foco em bloqueios).
- **Board é a fonte da verdade:** Se não está no board, não está sendo feito.
- **Respeito ao WIP:** Não puxar tarefas além do limite combinado.
- **Commits descritivos:** Seguir o padrão acima para facilitar o entendimento do histórico.
