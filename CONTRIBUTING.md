## 💬 Guia de Commits (Conventional Commits)

Para manter o histórico do Git organizado e legível, utilizamos o padrão **Conventional Commits** [citation:1]. A estrutura da mensagem deve ser:

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
| **`style`** | Formatação, ponto e vírgula, espaços (não muda lógica) | `style: ajusta indentação do arquivo` |
| **`refactor`** | Melhoria no código que não é bug nem feature | `refactor: extrai função de validação` |
| **`test`** | Adição ou correção de testes | `test: adiciona teste unitário para login` |
| **`chore`** | Tarefas de manutenção (build, dependências) | `chore: atualiza versão do Node` |

### 📌 Regras de Ouro
1. **Use o imperativo:** "adiciona" (e não "adicionado" ou "adicionando").
2. **Seja curto e claro:** A primeira linha deve resumir a mudança (até ~50-72 caracteres) [citation:2][citation:7].
3. **Sem ponto final** na descrição curta.
4. **Escopo (opcional):** Se a mudança for específica de uma parte, coloque entre parênteses. Ex: `feat(auth): adiciona login com Google`.

### 🔗 Vincular à Issue (opcional, mas recomendado)
Se o commit resolve uma tarefa do board, você pode referenciar a Issue no final da mensagem:
`fix: corrige erro de renderização (closes #12)`
