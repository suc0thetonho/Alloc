# Alloc — Guia do Projeto e Processo

Bem-vindo ao repositório oficial do projeto **Alloc**. Este documento serve como guia para a equipe sobre como utilizamos o GitHub Projects e como o fluxo de trabalho está organizado.

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

## 🔗 Links Úteis

- [📁 Documentação (Google Drive)](https://drive.google.com/drive/folders/1R6l-Ds37L3nQVcgp1DjRTSLbiVdokVp7?usp=sharing)
- [📊 Board do Projeto (GitHub Projects)](https://github.com/users/suc0thetonho/projects)

## 📌 Acordos da Equipe

- **Daily:** DE segunda a sexta (10 minutos, foco em bloqueios).
- **Board é a fonte da verdade:** Se não está no board, não está sendo feito.
- **Respeito ao WIP:** Não puxar tarefas além do limite combinado.
