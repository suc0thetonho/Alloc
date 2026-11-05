# Alloc Link — Protótipo navegável do MVP (tema industrial escuro)

**Entrega planejada:** 11 de dezembro de 2026  
**Tecnologias da demonstração:** HTML, CSS e JavaScript puro, sem bibliotecas externas.

## 1. Como abrir

1. Extraia todo o conteúdo do `.zip` mantendo a estrutura da pasta.
2. Abra a pasta `alloc_link_mvp_v3` no VS Code.
3. Instale ou utilize uma extensão simples como **Live Server**.
4. Abra `index.html` com o servidor local para acessar o catálogo do cliente.
5. Acesse `admin.html` para abrir o painel da empresa (ou clique no link **Área administrativa**).

Também é possível abrir os arquivos HTML diretamente, mas para compartilhar os dados entre as telas de maneira consistente é recomendado servir os arquivos em **um mesmo endereço local** usando Live Server.

### Login demonstrativo do administrador

- **E-mail:** `admin@alloclink.demo`
- **Senha:** `demo123`

> Importante: o login é uma simulação de interface. O protótipo não contém autenticação segura ou backend; nunca utilize essas credenciais ou este mecanismo em produção.

## 2. Identidade visual atualizada

O protótipo utiliza um tema industrial escuro inspirado na primeira proposta visual escolhida:
- Fundo grafite e verde profundo para transmitir robustez.
- Verde vivo para ações positivas, destaques e elementos de navegação.
- Laranja/amarelo de sinalização para botões principais e detalhes de segurança.
- Cartões escuros com contraste alto para facilitar a leitura das informações.
- Categorias e máquinas em carrosséis horizontais, com navegação por setas e rolagem no celular.
- O cadastro administrativo separa categoria, marca, modelo e finalidade da máquina, que também aparecem no catálogo do cliente.

## 3. O que o protótipo implementa

### Portal público (`index.html`)
- Identidade da locadora configurada no painel administrativo.
- Catálogo de máquinas, com tipos de equipamento, informações, quantidade total e unidades livres/ocupadas.
- Filtros por disponibilidade e pesquisa por máquina ou serviço.
- Sinalização de máquina própria ou de terceiro (parceiro).
- Formulário de solicitação **sem login** (nome, telefone, período e local opcional).
- Verificação de intervalo e da quantidade de unidades disponíveis em todo o período solicitado.
- O cliente pode selecionar a **quantidade desejada**, inclusive para datas futuras mesmo quando todas as unidades estejam ocupadas hoje.
- Confirmação com protocolo e status inicial `pendente`.
- Opção de abrir WhatsApp com mensagem pronta quando o número comercial é configurado. **O envio é manual pelo usuário.**

### Administração (`admin.html`)
- Tela de entrada demonstrativa.
- Dashboard com máquinas disponíveis, em operação e pedidos pendentes.
- Cadastro e edição de máquinas próprias ou de terceiros.
- Identificação e contato do proprietário externo (sem portal de parceiros).
- Marcação de máquina em manutenção.
- Recebimento, aprovação e recusa de solicitações, inclusive pedidos de várias unidades.
- **Notificar cliente**: após aprovar ou recusar, o administrador abre uma conversa no WhatsApp do contratante com mensagem pronta. O envio exige confirmação manual no aplicativo.
- Aprovação cria uma alocação da quantidade solicitada e verifica o limite de unidades em cada dia do período.
- Cadastro de **quantidade total de máquinas do mesmo tipo** e **unidades em manutenção** (por exemplo: 3 retroescavadeiras, 1 ocupada e 2 livres).
- Indicadores e catálogo atualizados para refletir quantidade disponível e em uso, inclusive quando a ocupação for parcial.
- Cadastro, edição e encerramento de alocações, com regras de prevenção de sobreposição.
- Personalização de **uma empresa por ambiente**: nome, logo, informações, contato, endereço e cor principal.
- Botão para restaurar os dados fictícios de demonstração.

### Experiência responsiva
Layout adaptado para computador, tablet e celular, com foco no catálogo público e nas ações essenciais de administração.

## 4. Teste rápido do fluxo principal

1. Entre em `index.html` e escolha uma máquina disponível.
2. Clique em **Solicitar equipamento**, preencha o formulário e envie.
3. Observe o número de protocolo gerado. O pedido continua pendente, sem alocação automática.
4. Entre em `admin.html` e faça o login de demonstração.
5. Abra **Solicitações**. Encontre o pedido, informe o local de utilização e clique em **Aprovar**.
6. Surge a janela **Notificar cliente**. Clique no botão do WhatsApp e confirme o envio no aplicativo. O botão continua disponível nos pedidos finalizados.
7. Acesse **Alocações** para conferir a criação do registro e sua quantidade.
8. Em **Máquinas → Editar**, veja a quantidade total. Por exemplo, com 3 retroescavadeiras, aloque 1 unidade e observe que as outras 2 permanecem disponíveis; uma quarta unidade simultânea será impedida.
9. Abra **Minha empresa** para modificar logo, cor, nome ou WhatsApp e confira o catálogo público.

## 5. Persistência e limitações

- Os dados são salvos no **localStorage do próprio navegador**: não existe banco de dados remoto.
- Para ver as mesmas alterações entre `index.html` e `admin.html`, ambos devem ser abertos na **mesma origem** (por exemplo, ambos pelo Live Server na mesma porta).
- Um navegador ou dispositivo diferente **não recebe esses dados**.
- O acesso administrativo está apenas simulado, sem autenticação real ou proteção dos registros.
- A loja/empresa é configurável, mas **não existe multiempresa com isolamento de contas** nesta versão.
- O WhatsApp **não recebe mensagem automática**. A notificação de aprovação/recusa abre `wa.me` com o texto de confirmação ao número do cliente; o administrador deve efetivamente pressionar **Enviar**. O protótipo não pode confirmar entrega/leitura.
- As máquinas e os pedidos são fictícios. Os exemplos servem apenas para validar interfaces e regras.
- O agendamento usa datas diárias inclusivas e **estoque por tipo de máquina**, sem identificar o número de patrimônio de cada unidade. Não é possível rastrear individualmente cada retroescavadeira; esse recurso exigiria registros separados.
- A disponibilidade exibida no catálogo é **a situação de hoje**. Reservas futuras consomem a capacidade apenas nas datas marcadas. Para saber se há unidades para todo um período, o cliente informa as datas no formulário.
- Unidades em manutenção são descontadas da capacidade do tipo, enquanto mantidas nesse estado.
- Casos complexos como horários parciais, cancelamento financeiro e contrato digital estão fora do MVP.
- A segurança de informações pessoais, proteção contra spam, processamento concorrente e controle de acesso terão de ser implementados no backend da versão real.

## 6. Funcionalidades que NÃO pertencem ao MVP atual

- Pré-avaliação por fotos do terreno.
- Apontamento das horas trabalhadas pelos operadores.
- Solicitações de prorrogação de períodos.
- Login e histórico completo do contratante.
- Gestão por múltiplas locadoras independentes e acesso dos parceiros.
- SMS ou WhatsApp automático via API.
- Pagamentos, relatórios financeiros, GPS e rastreamento.

## 7. Organização dos arquivos

```text
alloc_link_mvp_prototipo/
├── index.html      # Portal do cliente
├── admin.html      # Administração
├── style.css       # Design responsivo e formulários
├── core.js         # Dados de demonstração, regras comuns e utilitários
├── client.js       # Catálogo, filtros e pedidos
├── admin.js        # Dashboard, cadastros, pedidos e alocações
├── assets/         # Logo da ATC (exemplo), logo genérica e máquinas vetoriais
└── README.md
```

### Futuro backend
Os módulos de JavaScript foram separados para facilitar a futura substituição das funções de `core.js` por chamadas a API e banco de dados. Na implementação definitiva, é importante validar aprovação e conflitos **no servidor, em transação**, além de controlar acesso e tratar dados pessoais de acordo com a LGPD.


## Atualização v4 — catálogo simplificado (31/10/2026)

- A vitrine pública agora tem uma única seção **Máquinas**, com filtros de categoria em abas, filtro de situação e um carrossel horizontal de equipamentos.
- Os cards exibem somente **foto ilustrativa, nome, disponibilidade, Ver detalhes e Solicitar**.
- O botão **Ver detalhes** abre uma janela ampla, com contraste revisado, finalidade, marca, modelo, categoria, tipo de serviço e quantidade de unidades.
- A disponibilidade nos cards é referente ao dia atual. O formulário de solicitação continua validando as datas e quantidades para o período escolhido.
- Foram removidas a antiga seção visual de categorias e a faixa de benefícios, evitando repetição.
- O local da obra no formulário passou a ser opcional para reduzir o esforço do cliente. O administrador ainda pode completar esse dado ao aprovar a solicitação.
- O protótipo continua usando dados de demonstração no armazenamento local do navegador, **não** um backend de produção.


## Atualização V5 — cabeçalho e navegação lateral

- Cabeçalho público simplificado: logomarca, identificação Alloc Link e campo de busca.
- Acesso ao painel administrativo foi movido para o menu lateral (item **Entrar no painel**).
- O botão **Menu** abre uma gaveta lateral esquerda, semelhante à navegação do administrador, com links Início, Máquinas, Como alugar e Sobre a empresa.
- O menu fecha pelo botão ×, ao clicar fora, ao selecionar um link e com a tecla Esc.
- No celular, o campo de busca fica na segunda linha do cabeçalho para preservar a leitura e a área de toque.
- Alterações exclusivamente na navegação e no estilo. Regras de solicitação, disponibilidade, aprovação, cadastro de máquinas e painel administrativo permanecem inalterados.

## 8. Menu lateral do portal — versão V6

- O botão **Menu** aparece à esquerda da logomarca na parte superior da área pública.
- O painel abre **da esquerda para a direita** com uma transição suave e fecha deslizando de volta para a esquerda.
- Ao abrir, o restante da tela ganha um escurecimento com desfoque progressivo.
- O menu mantém opções de navegação e **Entrar no painel** no mesmo lugar, sem acrescentar uma etapa ao cliente.
- O menu fecha pelo botão ×, clicando no fundo escurecido, com `Esc`, ao selecionar um link ou, em telas de toque, deslizando para a esquerda.
- Enquanto está aberto, o foco do teclado fica no painel; quando é fechado, o foco retorna ao controle de abertura.
- Para pessoas que preferem menos movimento, as animações são desativadas automaticamente pela configuração de acessibilidade do dispositivo.
- Não há biblioteca nova, requisição externa ou mudança no armazenamento; as regras de solicitações, agenda e cadastro continuam as da versão anterior.
