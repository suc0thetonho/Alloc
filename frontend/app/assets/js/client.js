
(function () {
    "use strict";

    /*
    ========================================================
    1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
    ========================================================
    */

    // Importa as funcionalidades do core.js
    const A = window.Alloc;
    const isApiMode = () => window.AllocConfig?.mode === "api";

    let availabilitySequence = 0;
    // Facilita a seleção de elementos HTML
    const $ = (selector) => document.querySelector(selector);

    // Controles de pesquisa e filtros
    let search = "";
    let filter = "todas";
    let selectedCategory = "Todas";

    // Máquina selecionada para solicitação
    let selectedMachine = null;

    // Elemento que estava em foco antes de abrir um modal
    let lastFocused = null;

    // Ordem das categorias no catálogo
    const categoryOrder = [
        "Escavação",
        "Terraplenagem",
        "Carga e movimentação",
        "Nivelamento",
        "Operação geral"
    ];

    // O Backend pode informar a quantidade livre hoje.
    // Sem esse dado, não inventamos uma disponibilidade a partir de listas locais vazias.
    function displayStatus(machine, state) {
        const status = A.machineStatus(machine, state);

        if (!isApiMode()) {
            return { ...status, known: true };
        }

        const raw = machine.availableToday;
        const hasToday = raw !== undefined && raw !== null && raw !== "" &&
            Number.isInteger(Number(raw)) && Number(raw) >= 0;

        if (!hasToday) {
            return {
                ...status,
                known: false,
                key: status.maint === status.total ? "manutencao" : "indefinido"
            };
        }

        const free = Math.max(0, Math.min(
            status.total - status.maint,
            Number(raw)
        ));
        const rawUsed = machine.usedToday;
        const used = rawUsed !== undefined && rawUsed !== null && rawUsed !== "" &&
            Number.isInteger(Number(rawUsed)) && Number(rawUsed) >= 0
            ? Number(rawUsed)
            : Math.max(0, status.total - status.maint - free);

        return {
            ...status,
            known: true,
            free,
            used,
            key: status.maint === status.total
                ? "manutencao"
                : free > 0 ? "disponivel" : "alocada"
        };
    }

    function parseAvailability(response) {
        // Contrato esperado: { available: inteiro }.
        const raw = response?.available;
        if (raw === null || raw === undefined || raw === "") {
            throw new Error("O servidor não informou a disponibilidade.");
        }

        const available = Number(raw);
        if (!Number.isInteger(available) || available < 0) {
            throw new Error("O servidor retornou uma disponibilidade inválida.");
        }

        return available;
    }

    /*
    ========================================================
    2. CATEGORIAS E FILTROS
    ========================================================
    */

    function categories(state) {

        // Obtém as categorias existentes nas máquinas
        const distinct = [
            ...new Set(
                state.machines.map((m) => {
                    return m.category || A.categoryFromType(m.type);
                })
            )
        ];

        // Ordena as categorias
        distinct.sort((a, b) => {

            const ai = categoryOrder.indexOf(a);
            const bi = categoryOrder.indexOf(b);

            const orderA = ai < 0 ? 999 : ai;
            const orderB = bi < 0 ? 999 : bi;

            return (
                orderA - orderB ||
                a.localeCompare(b, "pt-BR")
            );
        });

        return ["Todas", ...distinct];
    }

    /*
    --------------------------------------------------------
    FILTRAR MÁQUINAS
    --------------------------------------------------------
    */

    function visibleMachines(state) {

        return state.machines.filter((m) => {

            const status = displayStatus(m, state).key;

            const category =
                m.category || A.categoryFromType(m.type);

            // Campos que podem ser pesquisados
            const haystack = [
                m.name,
                m.brand,
                m.model,
                m.purpose,
                m.description,
                m.type,
                category
            ]
                .join(" ")
                .toLocaleLowerCase("pt-BR");

            // Verifica a categoria selecionada
            const categoryMatches =
                selectedCategory === "Todas" ||
                selectedCategory === category;

            // Verifica o filtro de disponibilidade
            const statusMatches =
                filter === "todas" ||
                filter === status;

            // Verifica o texto pesquisado
            const searchMatches = haystack.includes(search);

            return (
                categoryMatches &&
                statusMatches &&
                searchMatches
            );
        });
    }

    /*
    --------------------------------------------------------
    RENDERIZAR ABAS DE CATEGORIAS
    --------------------------------------------------------
    */

    function renderTabs(state) {

        const list = categories(state);

        // Retorna para "Todas" caso a categoria não exista
        if (!list.includes(selectedCategory)) {
            selectedCategory = "Todas";
        }

        const tabs = list.map((cat) => {

            const active = selectedCategory === cat;

            return `
                <button
                    class="catalog-tab ${active ? "active" : ""}"
                    type="button"
                    aria-pressed="${active}"
                    data-category="${A.safe(cat)}"
                >
                    ${A.safe(cat)}
                </button>
            `;
        });

        $("#categoryTabs").innerHTML = tabs.join("");
    }

    /*
    ========================================================
    3. CARDS DAS MÁQUINAS
    ========================================================
    */

    function card(m, state) {

        // Só exibe disponibilidade de hoje se ela for conhecida.
        const st = displayStatus(m, state);
        const unavailable = st.maint === st.total;
        const statusUnknown = !st.known && !unavailable;

        const text = unavailable
            ? "Em manutenção"
            : statusUnknown
                ? "Consulte a disponibilidade"
                : st.free > 0
                    ? `${st.free} disponível${st.free === 1 ? "" : "is"} agora`
                    : "Sem unidades livres hoje";

        return `
            <article class="machine-compact-card">

                <button
                    class="machine-thumb-button"
                    type="button"
                    data-details="${A.safe(m.id)}"
                    aria-label="Ver detalhes de ${A.safe(m.name)}"
                >
                    <img
                        src="${A.assetFor(m)}"
                        loading="lazy"
                        alt="Ilustração de ${A.safe(m.name)}"
                    >

                    <span
                        class="thumb-corner"
                        aria-hidden="true"
                    >
                        ↗
                    </span>
                </button>

                <div class="machine-compact-body">

                    <h3 title="${A.safe(m.name)}">
                        ${A.safe(m.name)}
                    </h3>

                    <div class="machine-compact-availability ${st.key}">

                        <span
                            class="status-dot"
                            aria-hidden="true"
                        ></span>

                        ${text}

                    </div>

                    <div class="machine-compact-actions">

                        <button
                            class="btn btn-details"
                            type="button"
                            data-details="${A.safe(m.id)}"
                        >
                            Ver detalhes
                        </button>

                        <button
                            class="btn btn-ask"
                            type="button"
                            data-request="${A.safe(m.id)}"
                            ${unavailable
                                ? 'disabled aria-label="Indisponível por manutenção"'
                                : ""}
                        >
                            ${unavailable
                                ? "Indisponível"
                                : "Solicitar"}
                        </button>

                    </div>

                </div>

            </article>
        `;
    }

    /*
    ========================================================
    4. RENDERIZAÇÃO DO CATÁLOGO
    ========================================================
    */

    function render() {

        // Carrega os dados disponíveis
        const state = A.load();

        // Aplica a identidade visual da empresa
        A.applyBrand();

        // Apresenta o contato comercial
        $("#publicContact").textContent =
            state.company.phone ||
            state.company.whatsapp ||
            "Via solicitação no catálogo";

        // Atualiza as categorias
        renderTabs(state);

        // Filtra as máquinas
        const items = visibleMachines(state);

        // Elemento que contém o carrossel
        const rail = $("#machineCarousel");

        /*
        ----------------------------------------------------
        MÁQUINAS DISPONÍVEIS OU ESTADO VAZIO
        ----------------------------------------------------
        */

        if (items.length > 0) {

            // Apresenta os cards encontrados
            rail.innerHTML = items
                .map((m) => card(m, state))
                .join("");

        } else if (state.machines.length === 0) {

            // Nenhuma máquina foi carregada
            rail.innerHTML = `
                <div class="vitrine-empty">

                    ${A.ico("truck", 30)}

                    <strong>
                        Catálogo aguardando equipamentos
                    </strong>

                    <span>
                        As máquinas serão exibidas
                        quando os dados estiverem disponíveis.
                    </span>

                </div>
            `;

        } else {

            // Existem máquinas, mas nenhuma atende aos filtros
            rail.innerHTML = `
                <div class="vitrine-empty">

                    ${A.ico("search", 30)}

                    <strong>
                        Nenhuma máquina encontrada
                    </strong>

                    <span>
                        Experimente outra categoria
                        ou limpe os filtros.
                    </span>

                    <button
                        type="button"
                        class="btn btn-outline"
                        id="clearMachineFilters"
                    >
                        Limpar filtros
                    </button>

                </div>
            `;
        }

        // Retorna o carrossel para o início
        rail.scrollLeft = 0;

        /*
        ----------------------------------------------------
        LIMPAR FILTROS
        ----------------------------------------------------
        */

        rail
            .querySelector("#clearMachineFilters")
            ?.addEventListener("click", () => {

                search = "";
                filter = "todas";
                selectedCategory = "Todas";

                $("#machineSearch").value = "";
                $("#availabilityFilter").value = "todas";

                render();
            });

        // Atualiza os botões do carrossel
        updateArrows();
    }

    /*
    ========================================================
    5. CONTROLES DO CARROSSEL
    ========================================================
    */

    function updateArrows() {

        const rail = $("#machineCarousel");

        // Verifica se existem itens fora da área visível
        const enough =
            rail.scrollWidth > rail.clientWidth + 8;

        // Verifica se está no começo
        const atStart = rail.scrollLeft < 4;

        // Verifica se chegou ao final
        const atEnd =
            rail.scrollLeft + rail.clientWidth >=
            rail.scrollWidth - 5;

        // Habilita ou desabilita os botões
        $("#machinePrev").disabled =
            !enough || atStart;

        $("#machineNext").disabled =
            !enough || atEnd;
    }

    /*
    --------------------------------------------------------
    MOVIMENTAR CARROSSEL
    --------------------------------------------------------
    */

    function scrollMachines(direction) {

        const rail = $("#machineCarousel");

        const item = rail.querySelector(
            ".machine-compact-card"
        );

        if (!item) {
            return;
        }

        // Calcula o tamanho de um card mais o espaçamento
        const step =
            item.getBoundingClientRect().width + 16;

        rail.scrollBy({
            left: direction * step,
            behavior: "smooth"
        });
    }

    /*
    ========================================================
    6. CONTROLE DOS MODAIS
    ========================================================
    */

    function openModal(id) {

        const modal = $(id);

        // Guarda o elemento anteriormente selecionado
        lastFocused = document.activeElement;

        // Abre a janela
        modal.hidden = false;

        document.body.classList.add("modal-open");

        // Coloca o foco no botão de fechar
        const focusable = modal.querySelector(
            ".modal-close"
        );

        focusable?.focus();
    }

    /*
    --------------------------------------------------------
    FECHAR MODAL
    --------------------------------------------------------
    */

    function closeModal(id) {

        const modal = $(id);

        if (!modal || modal.hidden) {
            return;
        }

        modal.hidden = true;

        // Remove o bloqueio da página quando todos estão fechados
        const hasOpenModal = document.querySelector(
            ".modal-backdrop:not([hidden])"
        );

        if (!hasOpenModal) {
            document.body.classList.remove("modal-open");
        }

        // Retorna o foco para o elemento anterior
        if (lastFocused?.isConnected) {
            lastFocused.focus();
        }
    }

    /*
    ========================================================
    7. DETALHES DAS MÁQUINAS
    ========================================================
    */

    function openDetails(id) {

        const state = A.load();

        // Procura a máquina selecionada
        const m = state.machines.find(
            (item) => String(item.id) === String(id)
        );

        if (!m) {
            return;
        }

        const st = displayStatus(m, state);

        const unavailable = st.maint === st.total;

        /*
        ----------------------------------------------------
        INFORMAÇÕES DA MÁQUINA
        ----------------------------------------------------
        */

        const brand =
            m.brand && m.brand !== "Marca não informada"
                ? m.brand
                : "Não informada";

        const model =
            m.model && m.model !== "Modelo não informado"
                ? m.model
                : "Não informado";

        const purpose =
            m.purpose ||
            m.description ||
            m.type ||
            "Finalidade ainda não cadastrada.";

        const generic =
            m.description && m.description !== purpose
                ? m.description
                : null;

        /*
        ----------------------------------------------------
        DISPONIBILIDADE
        ----------------------------------------------------
        */

        const availabilityText = unavailable
            ? "Todas as unidades estão em manutenção"
            : !st.known
                ? "Consulte a disponibilidade para o período desejado"
                : st.free > 0
                    ? `${st.free} unidade${st.free === 1 ? "" : "s"} livre${st.free === 1 ? "" : "s"} hoje`
                    : "Todas as unidades estão em uso hoje";

        /*
        ----------------------------------------------------
        MONTAR MODAL
        ----------------------------------------------------
        */

        $("#detailsContent").innerHTML = `
            <div class="details-v4">

                <div class="details-v4-image">

                    <div class="detail-category">
                        ${A.safe(
                            m.category ||
                            A.categoryFromType(m.type)
                        )}
                    </div>

                    <img
                        src="${A.assetFor(m)}"
                        alt="Ilustração de ${A.safe(m.name)}"
                    >

                    <div class="detail-image-caption">
                        EQUIPAMENTO • ALLOC LINK
                    </div>

                </div>

                <div class="details-v4-content">

                    <div class="detail-overline">
                        INFORMAÇÕES DO EQUIPAMENTO
                    </div>

                    <h2 id="detailsModalTitle">
                        ${A.safe(m.name)}
                    </h2>

                    <p class="detail-intro">
                        Confira os dados da máquina antes de solicitar.
                    </p>

                    <div class="detail-status ${st.key}">

                        <span
                            class="status-dot"
                            aria-hidden="true"
                        ></span>

                        <div>

                            <strong>
                                ${A.safe(availabilityText)}
                            </strong>

                            <small>
                                ${st.known
                                    ? "Disponibilidade de hoje; outras datas podem ter outra situação."
                                    : "A disponibilidade será consultada ao escolher as datas."}
                            </small>

                        </div>

                    </div>

                    <section class="detail-purpose">

                        <h3>Para que serve?</h3>

                        <p>
                            ${A.safe(purpose)}
                        </p>

                    </section>

                    <dl class="detail-facts">

                        <div>
                            <dt>Marca</dt>
                            <dd>${A.safe(brand)}</dd>
                        </div>

                        <div>
                            <dt>Modelo</dt>
                            <dd>${A.safe(model)}</dd>
                        </div>

                        <div>
                            <dt>Categoria</dt>
                            <dd>
                                ${A.safe(
                                    m.category ||
                                    A.categoryFromType(m.type)
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt>Tipo de serviço</dt>
                            <dd>
                                ${A.safe(
                                    m.type || "Não informado"
                                )}
                            </dd>
                        </div>

                    </dl>

                    ${generic

                        ? `
                            <section class="detail-extra">

                                <h3>Informações gerais</h3>

                                <p>
                                    ${A.safe(generic)}
                                </p>

                            </section>
                        `

                        : ""
                    }

                    <p class="detail-count">

                        ${st.total} unidade(s) cadastrada(s)
                        ${st.known ? `· ${st.used} em uso` : ""}
                        · ${st.maint} em manutenção

                    </p>

                    <div class="detail-actions">

                        <button
                            class="btn btn-outline"
                            type="button"
                            data-detail-close
                        >
                            Voltar
                        </button>

                        <button
                            class="btn btn-primary"
                            type="button"
                            data-detail-request="${A.safe(m.id)}"
                            ${unavailable ? "disabled" : ""}
                        >
                            ${unavailable
                                ? "Indisponível para solicitação"
                                : "Solicitar esta máquina →"}
                        </button>

                    </div>

                </div>

            </div>
        `;

        openModal("#detailsModal");
    }

    /*
    ========================================================
    8. ABRIR FORMULÁRIO DE SOLICITAÇÃO
    ========================================================
    */

    function openRequest(id) {

        const state = A.load();

        const m = state.machines.find(
            (item) => String(item.id) === String(id)
        );

        // Verifica se a máquina possui capacidade operacional
        if (!m || A.capacity(m) === 0) {

            A.toast(
                "Todas as unidades estão em manutenção.",
                "error"
            );

            return;
        }

        // Registra a máquina selecionada
        selectedMachine = String(id);

        // Limpa o formulário
        $("#requestForm").reset();

        /*
        ----------------------------------------------------
        CONFIGURAÇÃO DAS DATAS
        ----------------------------------------------------
        */

        $("#requestStart").min = A.dayISO();
        $("#requestEnd").min = A.dayISO();

        $("#requestStart").value = A.dayISO(1);
        $("#requestEnd").value = A.dayISO(2);

        /*
        ----------------------------------------------------
        CONFIGURAÇÃO DA QUANTIDADE
        ----------------------------------------------------
        */

        $("#requestQty").max = A.machineQty(m);
        $("#requestQty").value = "1";

        /*
        ----------------------------------------------------
        PRÉVIA DA MÁQUINA ESCOLHIDA
        ----------------------------------------------------
        */

        $("#requestMachinePreview").innerHTML = `
            <img
                src="${A.assetFor(m)}"
                alt=""
            >

            <div>

                <span>
                    MÁQUINA SELECIONADA
                </span>

                <b>
                    ${A.safe(m.name)}
                </b>

                <small>
                    ${A.safe(m.brand)}
                    •
                    ${A.safe(m.model)}
                </small>

            </div>
        `;

        // Atualiza a disponibilidade
        updateAvailability();

        // Abre o formulário
        openModal("#requestModal");
    }

    /*
    ========================================================
    9. CONSULTAR DISPONIBILIDADE
    ========================================================
    */

    async function updateAvailability() {
        // Impede que uma resposta antiga sobrescreva a consulta mais recente.
        const sequence = ++availabilitySequence;
        const machineId = selectedMachine;
        const start = $("#requestStart").value;
        const end = $("#requestEnd").value;
        const quantity = Number($("#requestQty").value);
        const field = $("#requestAvailability");

        if (!machineId || !start || !end || end < start ||
            !Number.isInteger(quantity) || quantity < 1) {
            field.textContent = "Informe datas e quantidade válidas.";
            field.classList.add("availability-error");
            return;
        }

        let free;

        if (isApiMode()) {
            field.textContent = "Consultando disponibilidade...";
            field.classList.remove("availability-error");

            try {
                if (!window.AllocApi?.getAvailability) {
                    throw new Error("Consulta de disponibilidade não configurada.");
                }

                const response = await window.AllocApi.getAvailability(
                    machineId, start, end
                );

                if (sequence !== availabilitySequence) return;
                free = parseAvailability(response);
            } catch (error) {
                if (sequence !== availabilitySequence) return;
                field.textContent = `Não foi possível consultar: ${error.message}`;
                field.classList.add("availability-error");
                return;
            }
        } else {
            free = A.availableBetween(machineId, start, end);
        }

        if (sequence !== availabilitySequence) return;

        field.textContent = free > 0
            ? `${free} unidade(s) disponível(is) no período.`
            : "Nenhuma unidade disponível nesse período.";
        field.classList.toggle("availability-error", free < quantity);
    }

    /*
    ========================================================
    10. ENVIAR SOLICITAÇÃO
    ========================================================
    */

    let requestSending = false;

    async function onRequest(event) {
        event.preventDefault();
        if (requestSending) return;

        const form = event.currentTarget;
        const data = new FormData(form);
        const state = A.load();
        const machineId = String(selectedMachine ?? "");

        const name = String(data.get("name") || "").trim();
        const phone = String(data.get("phone") || "").trim();
        const location = String(data.get("location") || "").trim();
        const start = String(data.get("start") || "");
        const end = String(data.get("end") || "");
        const qty = Number(data.get("quantity"));
        const digits = A.phoneDigits(phone);
        const machine = state.machines.find(
            (item) => String(item.id) === machineId
        );

        if (name.length < 3) {
            A.toast("Informe seu nome completo.", "error");
            return;
        }

        if (digits.length < 10 || digits.length > 13) {
            A.toast("Informe um telefone válido com DDD.", "error");
            return;
        }

        if (!A.validDates(start, end)) {
            A.toast("Escolha um período válido.", "error");
            return;
        }

        if (!machine || A.capacity(machine) === 0) {
            A.toast("Equipamento indisponível.", "error");
            return;
        }

        if (!Number.isInteger(qty) || qty < 1 || qty > A.machineQty(machine)) {
            A.toast("Quantidade inválida.", "error");
            return;
        }

        const button = form.querySelector('[type="submit"]');
        const originalText = button?.textContent;
        requestSending = true;
        if (button) {
            button.disabled = true;
            button.textContent = "Enviando solicitação...";
        }

        let request;

        try {
            if (isApiMode()) {
                if (!window.AllocApi?.getAvailability || !window.AllocApi?.createRequest) {
                    throw new Error("O serviço de solicitações ainda não foi configurado.");
                }

                // A consulta ajuda o cliente; o servidor deve validar novamente
                // o estoque ao salvar o pedido, evitando condições de corrida.
                const availability = await window.AllocApi.getAvailability(
                    machineId, start, end
                );
                const free = parseAvailability(availability);

                if (free < qty) {
                    throw new Error(`Existem somente ${free} unidade(s) livres nesse período.`);
                }

                request = await window.AllocApi.createRequest({
                    machineId,
                    name,
                    phone,
                    location,
                    start,
                    end,
                    quantity: qty
                });

                if (!request || request.id === undefined || request.id === null || request.id === "") {
                    throw new Error("A resposta do servidor não contém o protocolo da solicitação.");
                }
            } else {
                const free = A.availableBetween(machineId, start, end, state);
                if (free < qty) {
                    throw new Error(`Existem somente ${free} unidade(s) livres nesse período.`);
                }

                const duplicate = state.requests.some((item) => (
                    String(item.machineId) === machineId &&
                    A.phoneDigits(item.phone) === digits &&
                    item.start === start &&
                    item.end === end &&
                    Number(item.quantity) === qty &&
                    item.status === "pendente"
                ));

                if (duplicate) {
                    throw new Error("Já existe uma solicitação pendente com esses dados.");
                }

                request = {
                    id: A.shortId("S"),
                    machineId,
                    name,
                    phone,
                    location,
                    start,
                    end,
                    quantity: qty,
                    status: "pendente",
                    createdAt: new Date().toISOString()
                };

                state.requests.unshift(request);
                if (!A.write(state)) {
                    // Não apresentar confirmação quando a gravação falhar.
                    state.requests.shift();
                    return;
                }
            }

            closeModal("#requestModal");
            $("#successCode").textContent = String(request.id);

            const message =
                `Olá! Registrei uma solicitação pelo Alloc Link.\n` +
                `Protocolo: ${request.id}\n` +
                `Máquina: ${machine.name}\n` +
                `Quantidade: ${qty} unidade(s)\n` +
                `Período: ${A.brDate(start)} a ${A.brDate(end)}\n` +
                `Nome: ${name}\n` +
                `Aguardo a confirmação da empresa.`;

            const link = A.waLink(state.company.whatsapp, message);
            $("#whatsappLink").hidden = !link;
            $("#whatsappMissing").hidden = !!link;
            if (link) $("#whatsappLink").href = link;

            openModal("#successModal");
        } catch (error) {
            A.toast(error.message || "Não foi possível enviar a solicitação.", "error");
            if (!isApiMode()) updateAvailability();
        } finally {
            requestSending = false;
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    /*
    ========================================================
    11. INICIALIZAÇÃO DO CATÁLOGO
    ========================================================
    */

    function init() {

        // Aplica o tema da empresa
        A.applyBrand();

        // Adiciona ícone de pesquisa
        $("#searchIcon").innerHTML = A.ico(
            "search",
            18
        );

        /*
        ----------------------------------------------------
        PESQUISA DE MÁQUINAS
        ----------------------------------------------------
        */

        $("#machineSearch").addEventListener(
            "input",
            (event) => {

                search = event.target.value
                    .trim()
                    .toLocaleLowerCase("pt-BR");

                render();
            }
        );

        /*
        ----------------------------------------------------
        FILTRO DE DISPONIBILIDADE
        ----------------------------------------------------
        */

        $("#availabilityFilter").addEventListener(
            "change",
            (event) => {

                filter = event.target.value;

                render();
            }
        );

        /*
        ----------------------------------------------------
        SELEÇÃO DE CATEGORIAS
        ----------------------------------------------------
        */

        $("#categoryTabs").addEventListener(
            "click",
            (event) => {

                const btn = event.target.closest(
                    "[data-category]"
                );

                if (!btn) {
                    return;
                }

                selectedCategory = btn.dataset.category;

                render();
            }
        );

        /*
        ----------------------------------------------------
        BOTÕES DOS CARDS
        ----------------------------------------------------
        */

        $("#machineCarousel").addEventListener(
            "click",
            (event) => {

                const details = event.target.closest(
                    "[data-details]"
                );

                const request = event.target.closest(
                    "[data-request]"
                );

                if (details) {

                    openDetails(
                        details.dataset.details
                    );

                } else if (request) {

                    openRequest(
                        request.dataset.request
                    );
                }
            }
        );

        /*
        ----------------------------------------------------
        BOTÕES DO MODAL DE DETALHES
        ----------------------------------------------------
        */

        $("#detailsContent").addEventListener(
            "click",
            (event) => {

                const close = event.target.closest(
                    "[data-detail-close]"
                );

                const request = event.target.closest(
                    "[data-detail-request]"
                );

                if (close) {

                    closeModal("#detailsModal");

                } else if (request) {

                    const id = request.dataset.detailRequest;

                    closeModal("#detailsModal");

                    openRequest(id);
                }
            }
        );

        /*
        ----------------------------------------------------
        NAVEGAÇÃO DO CARROSSEL
        ----------------------------------------------------
        */

        $("#machinePrev").addEventListener(
            "click",
            () => scrollMachines(-1)
        );

        $("#machineNext").addEventListener(
            "click",
            () => scrollMachines(1)
        );

        $("#machineCarousel").addEventListener(
            "scroll",
            updateArrows,
            {
                passive: true
            }
        );

        window.addEventListener(
            "resize",
            updateArrows
        );

        /*
        ----------------------------------------------------
        FORMULÁRIO DE SOLICITAÇÃO
        ----------------------------------------------------
        */

        $("#requestForm").addEventListener(
            "submit",
            onRequest
        );

        $("#requestStart").addEventListener(
            "change",
            (event) => {

                const end = $("#requestEnd");

                end.min = event.target.value;

                if (end.value < event.target.value) {
                    end.value = event.target.value;
                }

                updateAvailability();
            }
        );

        $("#requestEnd").addEventListener(
            "change",
            updateAvailability
        );

        $("#requestQty").addEventListener(
            "input",
            updateAvailability
        );

        /*
        ----------------------------------------------------
        FECHAR MODAIS PELOS BOTÕES
        ----------------------------------------------------
        */

        document
            .querySelectorAll("[data-close-modal]")
            .forEach((button) => {

                button.addEventListener("click", () => {

                    const modalId = button
                        .closest(".modal-backdrop")
                        .id;

                    closeModal("#" + modalId);
                });
            });

        /*
        ----------------------------------------------------
        FECHAR MODAIS CLICANDO FORA
        ----------------------------------------------------
        */

        document
            .querySelectorAll(".modal-backdrop")
            .forEach((modal) => {

                modal.addEventListener("click", (event) => {

                    if (event.target === modal) {

                        closeModal(
                            "#" + modal.id
                        );
                    }
                });
            });

        /*
        ----------------------------------------------------
        FECHAR MODAIS COM ESC
        ----------------------------------------------------
        */

        document.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Escape") {

                    document
                        .querySelectorAll(
                            ".modal-backdrop:not([hidden])"
                        )
                        .forEach((modal) => {

                            closeModal(
                                "#" + modal.id
                            );
                        });
                }
            }
        );

        /*
        ====================================================
        12. MENU LATERAL DO CATÁLOGO
        ====================================================
        */

        const menuButton = $("#clientMenuBtn");

        const sidebar = $("#clientSidebar");

        const backdrop = $("#clientSidebarBackdrop");

        const closeButton = $("#clientSidebarClose");

        // Elemento que abriu o menu
        let sidebarOpener = null;

        // Estado atual do menu
        let sidebarOpen = false;

        // Controle do gesto de toque
        let touchStart = null;

        /*
        ----------------------------------------------------
        ELEMENTOS NAVEGÁVEIS DO MENU
        ----------------------------------------------------
        */

        const sidebarItems = () => {

            return [
                ...sidebar.querySelectorAll(
                    "button:not([disabled]),a[href]"
                )
            ];
        };

        /*
        ----------------------------------------------------
        ABRIR MENU LATERAL
        ----------------------------------------------------
        */

        function openSidebar() {

            if (sidebarOpen) {
                return;
            }

            // Guarda o foco anterior
            sidebarOpener = document.activeElement;

            // Atualiza o estado
            sidebarOpen = true;

            // Permite interação com o menu
            sidebar.inert = false;

            sidebar.setAttribute(
                "aria-hidden",
                "false"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            menuButton.setAttribute(
                "aria-label",
                "Fechar menu de navegação"
            );

            // Ativa os estilos de abertura
            document.body.classList.add(
                "public-menu-open"
            );

            sidebar.classList.add(
                "is-open"
            );

            backdrop.classList.add(
                "is-open"
            );

            // Foco no botão de fechar
            closeButton.focus({
                preventScroll: true
            });
        }

        /*
        ----------------------------------------------------
        FECHAR MENU LATERAL
        ----------------------------------------------------
        */

        function closeSidebar({
            restoreFocus = true
        } = {}) {

            if (!sidebarOpen) {
                return;
            }

            // Atualiza o estado
            sidebarOpen = false;

            // Inicia a animação de fechamento
            sidebar.classList.remove(
                "is-open"
            );

            backdrop.classList.remove(
                "is-open"
            );

            sidebar.setAttribute(
                "aria-hidden",
                "true"
            );

            sidebar.inert = true;

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            menuButton.setAttribute(
                "aria-label",
                "Abrir menu de navegação"
            );

            document.body.classList.remove(
                "public-menu-open"
            );

            // Restaura o foco anterior
            if (
                restoreFocus &&
                sidebarOpener?.isConnected
            ) {

                sidebarOpener.focus({
                    preventScroll: true
                });
            }
        }

        /*
        ----------------------------------------------------
        ABRIR OU FECHAR PELO BOTÃO
        ----------------------------------------------------
        */

        menuButton.addEventListener("click", () => {

            if (sidebarOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        /*
        ----------------------------------------------------
        FECHAR PELO BOTÃO X
        ----------------------------------------------------
        */

        closeButton.addEventListener(
            "click",
            () => closeSidebar()
        );

        /*
        ----------------------------------------------------
        FECHAR CLICANDO NO FUNDO
        ----------------------------------------------------
        */

        backdrop.addEventListener(
            "click",
            () => closeSidebar()
        );

        /*
        ----------------------------------------------------
        FECHAR AO CLICAR EM UM LINK
        ----------------------------------------------------
        */

        sidebar.querySelectorAll("a").forEach((link) => {

            link.addEventListener("click", () => {

                const restoreFocus = !link
                    .getAttribute("href")
                    ?.startsWith("#");

                closeSidebar({
                    restoreFocus
                });
            });
        });

        /*
        ----------------------------------------------------
        CONTROLE POR TECLADO
        ----------------------------------------------------
        */

        document.addEventListener("keydown", (event) => {

            if (!sidebarOpen) {
                return;
            }

            // ESC fecha o menu
            if (event.key === "Escape") {

                event.preventDefault();

                closeSidebar();

                return;
            }

            /*
            Mantém a navegação por Tab
            dentro do menu lateral aberto.
            */

            if (event.key === "Tab") {

                const items = sidebarItems();

                if (!items.length) {
                    return;
                }

                const first = items[0];

                const last = items[
                    items.length - 1
                ];

                // Shift + Tab no primeiro elemento
                if (
                    event.shiftKey &&
                    (
                        document.activeElement === first ||
                        document.activeElement === sidebar
                    )
                ) {

                    event.preventDefault();

                    last.focus();

                } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                ) {

                    event.preventDefault();

                    first.focus();
                }
            }
        });

        /*
        ----------------------------------------------------
        FECHAR MENU COM GESTO NO CELULAR
        ----------------------------------------------------
        */

        sidebar.addEventListener(
            "touchstart",
            (event) => {

                if (event.touches.length !== 1) {
                    return;
                }

                touchStart = {

                    x: event.touches[0].clientX,

                    y: event.touches[0].clientY
                };
            },
            {
                passive: true
            }
        );

        sidebar.addEventListener(
            "touchend",
            (event) => {

                if (
                    !sidebarOpen ||
                    !touchStart ||
                    !event.changedTouches.length
                ) {
                    return;
                }

                const dx =
                    event.changedTouches[0].clientX -
                    touchStart.x;

                const dy =
                    event.changedTouches[0].clientY -
                    touchStart.y;

                /*
                Fecha se o usuário deslizar
                o menu para a esquerda.
                */

                if (
                    dx < -75 &&
                    Math.abs(dx) > Math.abs(dy) * 1.4
                ) {

                    closeSidebar();
                }

                touchStart = null;
            },
            {
                passive: true
            }
        );

        /*
        ====================================================
        13. ÍCONES DA SEÇÃO COMO ALUGAR
        ====================================================
        */

        $("#how1").innerHTML = A.ico(
            "search",
            25
        );

        $("#how2").innerHTML = A.ico(
            "eye",
            25
        );

        $("#how3").innerHTML = A.ico(
            "inbox",
            25
        );

        $("#how4").innerHTML = A.ico(
            "checkcircle",
            25
        );

        /*
        ====================================================
        14. ATUALIZAÇÃO DE DADOS ENTRE ABAS
        ====================================================
        */

        window.addEventListener("storage", (event) => {
            if (!isApiMode() && event.key === "alloclink_app_demo_v1") {
                location.reload();
            }
        });

        /*
        ====================================================
        15. RENDERIZAÇÃO INICIAL
        ====================================================
        */

        if (isApiMode()) {
            loadCatalogFromApi();
        } else {
            render();
        }
    }

    // Carrega dados remotos sem misturá-los com o localStorage.
    // A API de máquinas deve retornar um array (ou { machines: [...] } / { data: [...] }).
    async function loadCatalogFromApi() {
        const rail = $("#machineCarousel");
        rail.textContent = "Carregando equipamentos...";
        $("#machinePrev").disabled = true;
        $("#machineNext").disabled = true;

        try {
            if (!window.AllocApi?.getMachines || !A.receiveFromApi) {
                throw new Error("Confira o carregamento de config.js, api.js e core.js.");
            }

            const response = await window.AllocApi.getMachines();
            const machines = Array.isArray(response)
                ? response
                : Array.isArray(response?.machines)
                    ? response.machines
                    : Array.isArray(response?.data)
                        ? response.data
                        : null;

            if (!machines) {
                throw new Error("A API de máquinas deve retornar uma lista.");
            }

            let company = null;
            if (typeof window.AllocApi.getPublicCompany === "function") {
                try {
                    const responseCompany = await window.AllocApi.getPublicCompany();
                    company = responseCompany?.company || responseCompany?.data || responseCompany;
                    if (!company || typeof company !== "object" || Array.isArray(company)) {
                        company = null;
                    }
                } catch (error) {
                    // Uma falha nas informações institucionais não bloqueia o catálogo.
                    console.warn("Não foi possível carregar a empresa pública:", error);
                }
            }

            A.receiveFromApi({
                machines,
                ...(company ? { company } : {})
            });
            render();
        } catch (error) {
            rail.innerHTML = `
                <div class="vitrine-empty">
                    <strong>Não foi possível carregar o catálogo</strong>
                    <span>${A.safe(error.message || "Falha de conexão com o servidor.")}</span>
                    <button type="button" class="btn btn-outline" id="retryCatalog">
                        Tentar novamente
                    </button>
                </div>`;
            rail.querySelector("#retryCatalog")?.addEventListener("click", loadCatalogFromApi);
            A.toast("Não foi possível carregar os equipamentos.", "error");
        }
    }

    /*
    ========================================================
    EXECUTAR QUANDO O HTML ESTIVER PRONTO
    ========================================================
    */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();
