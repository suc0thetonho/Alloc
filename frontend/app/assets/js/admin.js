
/*
========================================================
ALLOC LINK — PAINEL ADMINISTRATIVO
========================================================
*/

(function () {
    "use strict";

    // Funções compartilhadas do core.js
    const A = window.Alloc;

    // Atalho para selecionar elementos do HTML
    const $ = (selector) => document.querySelector(selector);

    // Página administrativa atualmente selecionada
    let current = "dashboard";

    // Logomarca em edição
    let modalLogo = null;

    // Nomes das páginas
    const labels = {
        dashboard: "Painel geral",
        machines: "Máquinas",
        requests: "Solicitações",
        bookings: "Alocações",
        profile: "Meu perfil",
        company: "Minha empresa"
    };

    // Ícones das páginas
    const boxIcon = {
        dashboard: "layers",
        machines: "truck",
        requests: "inbox",
        bookings: "calendar",
        profile: "user",
        company: "building",
        public: "external"
    };

    // Categorias disponíveis para cadastro
    const machineCategories = [
        "Escavação",
        "Terraplenagem",
        "Carga e movimentação",
        "Nivelamento",
        "Operação geral"
    ];

    /*
    ========================================================
    FUNÇÕES AUXILIARES
    ========================================================
    */

    // Gera um campo de formulário reutilizável
    const inp = (
        label,
        name,
        value = "",
        opts = {}
    ) => {

        const fieldClass = opts.full
            ? "field field-full"
            : "field";

        const optional = opts.optional
            ? '<span class="optional"> (opcional)</span>'
            : "";

        const type = opts.type || "text";

        const required = opts.required
            ? "required"
            : "";

        const min = opts.min
            ? `min="${A.safe(opts.min)}"`
            : "";

        const maxlength = opts.maxlength
            ? `maxlength="${opts.maxlength}"`
            : "";

        return `
            <label class="${fieldClass}">
                ${A.safe(label)}
                ${optional}

                <input
                    type="${type}"
                    name="${A.safe(name)}"
                    value="${A.safe(value)}"
                    ${required}
                    ${min}
                    ${maxlength}
                    placeholder="${A.safe(opts.placeholder || "")}"
                />
            </label>
        `;
    };

    // Cria uma etiqueta de situação
    const pill = (label, key) => {
        return `
            <span class="status-pill status-${A.safe(key)}">
                <i></i>
                ${A.safe(label)}
            </span>
        `;
    };

    /*
    ========================================================
    1. AUTENTICAÇÃO E NAVEGAÇÃO
    ========================================================
    */

    function canLogin() {
        return sessionStorage.getItem("alloc_demo_auth") === "1";
    }

    function loginView() {

        const auth = canLogin();

        $("#loginLayer").hidden = auth;
        $("#adminShell").hidden = !auth;

        if (auth) {
            A.applyBrand();
            showPage(current);
        }
    }

    function showPage(view) {

        current = view;

        $("#currentSection").textContent = "Administração";
        $("#currentTitle").textContent = labels[view];

        document.querySelectorAll("[data-view]").forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.view === view
            );

        });

        $("#adminSidebar").classList.remove("open");

        render();
    }

    /*
    ========================================================
    2. RENDERIZAÇÃO DO PAINEL
    ========================================================
    */

    function render() {

        const d = A.load();

        A.applyBrand();

        const pending = d.requests.filter(
            (request) => request.status === "pendente"
        ).length;

        $("#pendingSidebar").hidden = pending === 0;
        $("#pendingSidebar").textContent = pending;

        const map = {
            dashboard: renderDashboard,
            machines: renderMachines,
            requests: renderRequests,
            bookings: renderBookings,

            profile: () => window.AllocProfile.render(),

            company: renderCompany
        };

        $("#adminContent").innerHTML = map[current](d);

        wireCurrent(d);
    }

    // Cabeçalho reutilizável das páginas
    function headline(eyebrow, title, desc, button = "") {

        return `
            <div class="admin-head">

                <div>
                    <div class="eyebrow eyebrow-soft">
                        ${eyebrow}
                    </div>

                    <h1>${title}</h1>
                    <p>${desc}</p>
                </div>

                ${button}

            </div>
        `;
    }

    // Conta unidades conforme a situação
    function statusCount(d, key) {

        return d.machines.reduce((sum, machine) => {

            const status = A.machineStatus(machine, d);

            if (key === "disponivel") {
                return sum + status.free;
            }

            if (key === "alocada") {
                return sum + status.used;
            }

            return sum + status.maint;

        }, 0);
    }

    // Soma todas as unidades cadastradas
    function totalUnits(d) {

        return d.machines.reduce(
            (sum, machine) => sum + A.machineQty(machine),
            0
        );
    }

    // Calcula porcentagem
    function pct(number, total) {

        if (!total) {
            return 0;
        }

        return Math.round((number * 100) / total);
    }

    // Etiqueta de situação de uma solicitação
    function requestPill(status) {

        const label =
            status === "pendente"
                ? "Pendente"
                : status === "aprovado"
                    ? "Aprovada"
                    : "Recusada";

        return `
            <span class="request-status request-${status}">
                ${label}
            </span>
        `;
    }

    // Mensagem para listas sem registros
    function empty(title, description) {

        return `
            <div class="empty-state">

                ${A.ico("inbox", 28)}

                <h3>${title}</h3>

                <p>${description}</p>

            </div>
        `;
    }

    /*
    ========================================================
    3. DASHBOARD — PAINEL GERAL
    ========================================================
    */

    function renderDashboard(d) {

        const pending = d.requests.filter(
            (request) => request.status === "pendente"
        );

        const recent = [...d.requests]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

        const active = statusCount(d, "alocada");

        // Card de indicador
        const stat = (icon, title, value, note, color) => {

            return `
                <article class="stat-card">

                    <span class="stat-icon ${color}">
                        ${A.ico(icon, 22)}
                    </span>

                    <div class="stat-label">
                        ${title}
                    </div>

                    <div class="stat-number">
                        ${value}
                    </div>

                    <div class="stat-note">
                        ${note}
                    </div>

                </article>
            `;
        };

        // Solicitações recentes
        const recentHtml = recent.length

            ? `
                <div class="table-wrap">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Máquina</th>
                                <th>Período</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${recent.map((request) => {

                                const machine = d.machines.find(
                                    (item) => item.id === request.machineId
                                );

                                return `
                                    <tr>

                                        <td>
                                            <b>${A.safe(request.name)}</b>
                                            <small>#${A.safe(request.id)}</small>
                                        </td>

                                        <td>
                                            ${A.safe(
                                                machine?.name ||
                                                "Equipamento removido"
                                            )}
                                        </td>

                                        <td>
                                            ${A.brDate(request.start)}
                                            <br>
                                            ${A.brDate(request.end)}
                                        </td>

                                        <td>
                                            ${requestPill(request.status)}
                                        </td>

                                    </tr>
                                `;

                            }).join("")}

                        </tbody>

                    </table>

                </div>
            `

            : empty(
                "Nenhum pedido recebido",
                "Quando clientes solicitarem máquinas, os pedidos aparecerão aqui."
            );

        // Identificação da empresa
        const companyStatus = d.company.name
            ? "EMPRESA CONFIGURADA"
            : "AGUARDANDO CONFIGURAÇÃO";

        const companyName = A.safe(
            d.company.name || "Empresa não cadastrada"
        );

        return `

            ${headline(
                "VISÃO DA OPERAÇÃO",
                "Painel geral",
                "Os indicadores serão preenchidos quando houver dados disponíveis.",
                `
                    <button
                        class="btn btn-primary"
                        data-action="add-machine"
                    >
                        ${A.ico("plus", 17)}
                        Nova máquina
                    </button>
                `
            )}

            <div class="dashboard-company">

                <span class="dc-icon">
                    ${A.ico("building", 24)}
                </span>

                <div>

                    <span>
                        ${companyStatus}
                    </span>

                    <strong>
                        ${companyName}
                    </strong>

                    <small>
                        Uma empresa por ambiente no MVP
                    </small>

                </div>

                <button
                    class="btn btn-small btn-outline"
                    data-action="go-company"
                >
                    Personalizar
                    ${A.ico("arrow", 15)}
                </button>

            </div>

            <div class="stats-grid">

                ${stat(
                    "truck",
                    "Total de unidades",
                    totalUnits(d),
                    "Em " + d.machines.length + " tipo(s) de equipamento",
                    "s-green"
                )}

                ${stat(
                    "checkcircle",
                    "Disponíveis agora",
                    statusCount(d, "disponivel"),
                    "Aptas para solicitação",
                    "s-lime"
                )}

                ${stat(
                    "clock",
                    "Em operação",
                    active,
                    "Unidades em uso hoje",
                    "s-yellow"
                )}

                ${stat(
                    "inbox",
                    "Pedidos pendentes",
                    pending.length,
                    "Aguardando sua análise",
                    "s-orange"
                )}

            </div>

            <div class="dashboard-columns">

                <section class="panel">

                    <div class="panel-head">

                        <div>
                            <h2>Solicitações recentes</h2>
                            <p>Pedidos feitos pelo catálogo público</p>
                        </div>

                        <button
                            class="link-button"
                            data-action="go-requests"
                        >
                            Ver todas →
                        </button>

                    </div>

                    ${recentHtml}

                </section>

                <section class="panel">

                    <div class="panel-head">

                        <div>
                            <h2>Visão da frota</h2>
                            <p>Estado dos equipamentos hoje</p>
                        </div>

                    </div>

                    <div class="fleet-summary">

                        <div>
                            <span class="summary-dot green"></span>
                            Disponíveis

                            <strong>
                                ${statusCount(d, "disponivel")}
                            </strong>
                        </div>

                        <div>
                            <span class="summary-dot orange"></span>
                            Alocadas

                            <strong>
                                ${statusCount(d, "alocada")}
                            </strong>
                        </div>

                        <div>
                            <span class="summary-dot gray"></span>
                            Manutenção

                            <strong>
                                ${statusCount(d, "manutencao")}
                            </strong>
                        </div>

                    </div>

                    <div class="bar-track">

                        <div
                            style="
                                width:${pct(
                                    statusCount(d, "disponivel"),
                                    totalUnits(d)
                                )}%;
                                background:#39a065;
                            "
                        ></div>

                        <div
                            style="
                                width:${pct(
                                    statusCount(d, "alocada"),
                                    totalUnits(d)
                                )}%;
                                background:#f2b45a;
                            "
                        ></div>

                        <div
                            style="
                                width:${pct(
                                    statusCount(d, "manutencao"),
                                    totalUnits(d)
                                )}%;
                                background:#9babb0;
                            "
                        ></div>

                    </div>

                    <div class="quick-actions">

                        <button
                            data-action="add-booking"
                            class="quick-action"
                        >

                            ${A.ico("calendar", 20)}

                            <span>
                                <b>Nova alocação</b>
                                <small>Registrar um período</small>
                            </span>

                            ${A.ico("arrow", 18)}

                        </button>

                        <button
                            data-action="go-machines"
                            class="quick-action"
                        >

                            ${A.ico("truck", 20)}

                            <span>
                                <b>Gerenciar frota</b>
                                <small>Máquinas e parceiros</small>
                            </span>

                            ${A.ico("arrow", 18)}

                        </button>

                    </div>

                </section>

            </div>
        `;
    }

    /*
    ========================================================
    4. LISTAGEM DE MÁQUINAS
    ========================================================
    */

    function renderMachines(d) {

        const cards = d.machines.map((machine) => {

            const status = A.machineStatus(machine, d);

            const category = A.safe(
                machine.category ||
                A.categoryFromType(machine.type)
            );

            const partnerHtml = machine.origin === "terceiros"

                ? `
                    <div class="partner-line">
                        ${A.ico("user", 15)}
                        ${A.safe(
                            machine.partner ||
                            "Proprietário não informado"
                        )}
                    </div>
                `

                : "";

            return `
                <article class="admin-machine-card">

                    <div class="admin-machine-img">

                        <img
                            src="${A.assetFor(machine)}"
                            alt=""
                        >

                        <span class="origin-chip">
                            ${machine.origin === "terceiros"
                                ? "De parceiro"
                                : "Própria"}
                        </span>

                        <span class="admin-category-badge">
                            ${category}
                        </span>

                    </div>

                    <div class="admin-machine-body">

                        <div class="machine-title-row">
                            <h3>${A.safe(machine.name)}</h3>
                        </div>

                        <p>
                            ${A.safe(machine.brand || "Marca não informada")}
                            •
                            ${A.safe(machine.model || "Modelo não informado")}
                        </p>

                        <div class="unit-count">

                            ${A.ico("layers", 15)}

                            <b>
                                ${status.total} unidade(s)
                            </b>

                            · ${status.free} livres
                            · ${status.used} em uso
                            · ${status.maint} manutenção

                        </div>

                        <div class="status-row">

                            ${pill(status.text, status.key)}

                            <small>
                                ${A.safe(status.hint)}
                            </small>

                        </div>

                        <div class="admin-machine-purpose">

                            <b>Para que serve:</b>

                            <span>
                                ${A.safe(
                                    machine.purpose ||
                                    machine.description ||
                                    machine.type
                                )}
                            </span>

                        </div>

                        ${partnerHtml}

                        <div class="admin-card-actions">

                            <button
                                class="btn btn-small btn-outline"
                                data-action="edit-machine"
                                data-id="${machine.id}"
                            >
                                ${A.ico("edit", 15)}
                                Editar
                            </button>

                            <button
                                class="btn btn-small btn-subtle"
                                data-action="toggle-maintenance"
                                data-id="${machine.id}"
                            >
                                Ajustar manutenção
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");

        const emptyMessage = d.machines.length === 0

            ? empty(
                "Nenhuma máquina carregada",
                "Os equipamentos aparecerão aqui após o cadastro ou a integração com a API."
            )

            : "";

        return `

            ${headline(
                "GERENCIAMENTO DA FROTA",
                "Máquinas e equipamentos",
                "Cadastre máquinas próprias ou de terceiros e mantenha a situação atualizada.",
                `
                    <button
                        class="btn btn-primary"
                        data-action="add-machine"
                    >
                        ${A.ico("plus", 17)}
                        Adicionar máquina
                    </button>
                `
            )}

            <div class="mini-summary">

                ${A.ico("info", 17)}

                O cadastro agora destaca
                <strong>categoria</strong>,
                <strong>marca</strong>,
                <strong>modelo</strong>
                e
                <strong>para que a máquina serve</strong>,
                em linha com o catálogo do cliente.

            </div>

            ${emptyMessage}

            <div class="admin-machine-grid">
                ${cards}
            </div>
        `;
    }

    /*
    ========================================================
    5. SOLICITAÇÕES DOS CLIENTES
    ========================================================
    */

    function renderRequests(d) {

        const total = d.requests.length;

        const pending = d.requests.filter(
            (request) => request.status === "pendente"
        ).length;

        return `

            ${headline(
                "ATENDIMENTO",
                "Solicitações de contratação",
                "Os pedidos não bloqueiam a máquina antes da aprovação pelo administrador."
            )}

            <div class="filter-row">

                <button
                    class="filter-tab active"
                    data-reqfilter="todos"
                >
                    Todos
                    <span>${total}</span>
                </button>

                <button
                    class="filter-tab"
                    data-reqfilter="pendente"
                >
                    Pendentes
                    <span>${pending}</span>
                </button>

                <button
                    class="filter-tab"
                    data-reqfilter="aprovado"
                >
                    Aprovados
                </button>

                <button
                    class="filter-tab"
                    data-reqfilter="recusado"
                >
                    Recusados
                </button>

            </div>

            <div id="requestsList">
                ${requestsHtml(d, "todos")}
            </div>
        `;
    }

    function requestsHtml(d, filter) {

        const requests = [...d.requests]

            .filter((request) => {
                return filter === "todos" ||
                    request.status === filter;
            })

            .sort((a, b) => {
                return b.createdAt.localeCompare(a.createdAt);
            });

        if (requests.length === 0) {

            return empty(
                "Nenhuma solicitação nesta categoria",
                "Assim que forem enviadas, você poderá analisá-las aqui."
            );
        }

        const cards = requests.map((request) => {

            const machine = d.machines.find(
                (item) => item.id === request.machineId
            );

            const actions = request.status === "pendente"

                ? `
                    <button
                        class="btn btn-primary btn-small"
                        data-action="approve-request"
                        data-id="${request.id}"
                    >
                        ${A.ico("check", 16)}
                        Aprovar
                    </button>

                    <button
                        class="btn btn-outline btn-small"
                        data-action="reject-request"
                        data-id="${request.id}"
                    >
                        Recusar
                    </button>
                `

                : `
                    <span class="readonly-note">
                        Análise finalizada
                    </span>

                    <button
                        class="btn btn-primary btn-small"
                        data-action="notify-request"
                        data-id="${A.safe(request.id)}"
                    >
                        ${A.ico("phone", 15)}
                        Notificar cliente
                    </button>
                `;

            return `
                <article class="request-item">

                    <div class="request-icon">
                        ${A.ico("inbox", 22)}
                    </div>

                    <div class="request-main">

                        <div class="request-item-head">

                            <h3>
                                ${A.safe(request.name)}
                            </h3>

                            ${requestPill(request.status)}

                        </div>

                        <div class="request-id">
                            Protocolo ${A.safe(request.id)}
                            •
                            ${A.brDate(request.createdAt.slice(0, 10))}
                        </div>

                        <div class="request-fields">

                            <div>
                                <span>Equipamento / Qtde.</span>
                                <b>
                                    ${A.safe(
                                        machine?.name ||
                                        "Máquina não encontrada"
                                    )}
                                    ·
                                    ${A.safe(request.quantity || 1)}
                                    un.
                                </b>
                            </div>

                            <div>
                                <span>Período</span>
                                <b>
                                    ${A.brDate(request.start)}
                                    a
                                    ${A.brDate(request.end)}
                                </b>
                            </div>

                            <div>
                                <span>Contato</span>
                                <b>${A.safe(request.phone)}</b>
                            </div>

                            <div>
                                <span>Local</span>
                                <b>
                                    ${A.safe(
                                        request.location ||
                                        "Não informado"
                                    )}
                                </b>
                            </div>

                        </div>

                    </div>

                    <div class="request-actions">
                        ${actions}
                    </div>

                </article>
            `;

        }).join("");

        return `
            <div class="request-list">
                ${cards}
            </div>
        `;
    }

    /*
    ========================================================
    6. CONTROLE DE ALOCAÇÕES
    ========================================================
    */

    function renderBookings(d) {

        const bookings = [...d.bookings].sort(
            (a, b) => b.start.localeCompare(a.start)
        );

        const rows = bookings.map((booking) => {

            const machine = d.machines.find(
                (item) => item.id === booking.machineId
            );

            const status = booking.status === "encerrada"
                ? "Encerrada"
                : booking.start > A.dayISO()
                    ? "Agendada"
                    : booking.end < A.dayISO()
                        ? "Período finalizado"
                        : "Em andamento";

            const actions = booking.status === "ativa"

                ? `
                    <button
                        class="btn btn-small btn-outline"
                        data-action="edit-booking"
                        data-id="${booking.id}"
                    >
                        Editar
                    </button>

                    <button
                        class="btn btn-small btn-subtle"
                        data-action="end-booking"
                        data-id="${booking.id}"
                    >
                        Encerrar
                    </button>
                `

                : "—";

            return `
                <tr>

                    <td>

                        <b>
                            ${A.safe(machine?.name || "Não encontrada")}
                        </b>

                        <small>
                            ${A.safe(booking.id)}
                            ·
                            ${A.safe(booking.quantity || 1)}
                            unidade(s)
                        </small>

                    </td>

                    <td>

                        ${A.safe(booking.customer)}

                        <small>
                            ${A.safe(booking.location || "Sem local")}
                        </small>

                    </td>

                    <td>

                        ${A.brDate(booking.start)}

                        <small>
                            até ${A.brDate(booking.end)}
                        </small>

                    </td>

                    <td>

                        <span class="request-status ${
                            booking.status === "encerrada"
                                ? "request-recusado"
                                : "request-aprovado"
                        }">
                            ${status}
                        </span>

                    </td>

                    <td>
                        <div class="table-actions">
                            ${actions}
                        </div>
                    </td>

                </tr>
            `;

        }).join("");

        const emptyRow = `
            <tr>
                <td
                    colspan="5"
                    style="padding:24px;text-align:center"
                >
                    Nenhuma alocação carregada.
                </td>
            </tr>
        `;

        return `

            ${headline(
                "AGENDA OPERACIONAL",
                "Controle de alocações",
                "Registre os períodos de uso e evite conflitos entre serviços.",
                `
                    <button
                        class="btn btn-primary"
                        data-action="add-booking"
                    >
                        ${A.ico("plus", 17)}
                        Nova alocação
                    </button>
                `
            )}

            <div class="mini-summary">

                ${A.ico("shield", 18)}

                A soma das unidades alocadas simultaneamente
                não pode ultrapassar a capacidade disponível
                em cada data.

            </div>

            <div class="panel bookings-panel">

                <div class="table-wrap">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Máquina / Qtde.</th>
                                <th>Cliente / Local</th>
                                <th>Período</th>
                                <th>Situação</th>
                                <th>Operações</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rows || emptyRow}
                        </tbody>

                    </table>

                </div>

            </div>
        `;
    }

    /*
    ========================================================
    7. PERSONALIZAÇÃO DA EMPRESA
    ========================================================
    */

    function renderCompany(d) {

        const company = d.company;

        return `

            ${headline(
                "IDENTIDADE E CONTATO",
                "Minha empresa",
                "Configure a marca que seus clientes verão no catálogo público."
            )}

            <div class="company-layout">

                <section class="panel company-form-panel">

                    <h2>Informações da empresa</h2>

                    <p class="subheading">
                        O MVP utiliza uma empresa configurável por ambiente.
                        Não há cadastro simultâneo de várias locadoras.
                    </p>

                    <form id="companyForm">

                        <div class="company-logo-edit">

                            <div class="company-logo-big">

                                <img
                                    id="companyLogoPreview"
                                    src="${A.logoFor(company.logo)}"
                                    alt="Prévia da logo"
                                >

                            </div>

                            <div>

                                <b>Logomarca</b>

                                <p>
                                    Formatos PNG, JPG ou WebP, até 5 MB.
                                    A imagem será redimensionada para
                                    a demonstração.
                                </p>

                                <label
                                    class="btn btn-small btn-outline logo-upload"
                                >
                                    ${A.ico("upload", 16)}
                                    Trocar logo

                                    <input
                                        id="logoInput"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        hidden
                                    >

                                </label>

                                <button
                                    type="button"
                                    id="clearLogo"
                                    class="text-mini-button"
                                >
                                    Usar logo genérica
                                </button>

                            </div>

                        </div>

                        <div class="form-grid">

                            ${inp(
                                "Nome da empresa",
                                "name",
                                company.name,
                                {
                                    required: true,
                                    full: true,
                                    maxlength: 90
                                }
                            )}

                            ${inp(
                                "Descrição curta",
                                "tagline",
                                company.tagline,
                                {
                                    full: true,
                                    maxlength: 160
                                }
                            )}

                            <label class="field field-full">

                                Descrição para o catálogo

                                <textarea
                                    name="description"
                                    rows="3"
                                    maxlength="600"
                                >${A.safe(company.description)}</textarea>

                            </label>

                            ${inp(
                                "Cidade",
                                "city",
                                company.city,
                                {
                                    required: true
                                }
                            )}

                            ${inp(
                                "Estado (UF)",
                                "state",
                                company.state,
                                {
                                    required: true,
                                    maxlength: 2
                                }
                            )}

                            ${inp(
                                "Endereço",
                                "address",
                                company.address,
                                {
                                    full: true,
                                    optional: true,
                                    maxlength: 180
                                }
                            )}

                            ${inp(
                                "Telefone",
                                "phone",
                                company.phone,
                                {
                                    optional: true
                                }
                            )}

                            ${inp(
                                "WhatsApp comercial",
                                "whatsapp",
                                company.whatsapp,
                                {
                                    optional: true,
                                    placeholder: "DDD + número"
                                }
                            )}

                            ${inp(
                                "E-mail",
                                "email",
                                company.email,
                                {
                                    type: "email",
                                    full: true,
                                    optional: true
                                }
                            )}

                            <label class="field field-full">

                                Cor principal da marca

                                <div class="color-control">

                                    <input
                                        type="color"
                                        name="brand"
                                        value="${A.safe(
                                            company.brand || "#278445"
                                        )}"
                                    >

                                    <span>
                                        Aplicada a botões e destaques do portal
                                    </span>

                                </div>

                            </label>

                        </div>

                        <div class="form-foot">

                            <button
                                class="btn btn-primary"
                                type="submit"
                            >
                                ${A.ico("check", 17)}
                                Salvar alterações
                            </button>

                        </div>

                    </form>

                </section>

                <aside class="company-side">

                    <div class="panel company-preview-panel">

                        <div class="eyebrow eyebrow-soft">
                            PRÉVIA DO PERFIL
                        </div>

                        <div class="company-preview-card">

                            <img
                                data-company-logo
                                src="${A.logoFor(company.logo)}"
                                alt="Logo da empresa"
                            >

                            <h3>
                                ${A.safe(
                                    company.name ||
                                    "Empresa não cadastrada"
                                )}
                            </h3>

                            <p>
                                ${A.safe(company.tagline)}
                            </p>

                            <span>
                                ${A.ico("pin", 15)}

                                ${A.safe(
                                    [company.city, company.state]
                                        .filter(Boolean)
                                        .join(" / ")
                                )}
                            </span>

                        </div>

                        <p>
                            Nome, logo, descrição e cor de destaque
                            aparecem no portal público.
                        </p>

                        <a
                            href="index.html"
                            target="_blank"
                            rel="noopener"
                            class="btn btn-outline btn-block"
                        >
                            Visualizar o catálogo ↗
                        </a>

                    </div>

                    <div class="panel panel-warning">

                        <b>
                            ${A.ico("info", 17)}
                            WhatsApp
                        </b>

                        <p>
                            Para habilitar o botão após uma solicitação,
                            informe um número comercial válido com DDD.
                            A mensagem só é enviada se o cliente
                            confirmar no WhatsApp.
                        </p>

                    </div>

                    <div class="panel demo-reset-panel">

                        <h3>
                            Reiniciar demonstração
                        </h3>

                        <p>
                            Restaura os dados fictícios de máquinas,
                            pedidos e empresa para realizar uma
                            nova apresentação.
                        </p>

                        <button
                            class="btn btn-outline btn-block btn-small"
                            data-action="reset-demo"
                            type="button"
                        >
                            ${A.ico("refresh", 16)}
                            Restaurar dados de exemplo
                        </button>

                    </div>

                </aside>

            </div>
        `;
    }

    /*
    ========================================================
    8. EVENTOS E AÇÕES DO PAINEL
    ========================================================
    */

    function wireCurrent(d) {

        // Botões com ações administrativas
        document.querySelectorAll("[data-action]").forEach((element) => {

            element.addEventListener("click", () => {

                handleAction(
                    element.dataset.action,
                    element.dataset.id
                );

            });

        });

        // Filtros das solicitações
        if (current === "requests") {

            document.querySelectorAll("[data-reqfilter]").forEach((button) => {

                button.addEventListener("click", () => {

                    document.querySelectorAll("[data-reqfilter]")
                        .forEach((item) => {

                            item.classList.toggle(
                                "active",
                                item === button
                            );

                        });

                    $("#requestsList").innerHTML = requestsHtml(
                        A.load(),
                        button.dataset.reqfilter
                    );

                    $("#requestsList")
                        .querySelectorAll("[data-action]")
                        .forEach((element) => {

                            element.addEventListener("click", () => {

                                handleAction(
                                    element.dataset.action,
                                    element.dataset.id
                                );

                            });

                        });

                });

            });
        }

        // Eventos da tela Minha empresa
        if (current === "company") {
            wireCompany();
        }

        // Eventos da tela Meu perfil
        if (current === "profile") {
            window.AllocProfile.wire();
        }
    }

    function handleAction(action, id) {

        const d = A.load();

        /*
        ----------------------------
        AÇÕES DE MÁQUINAS
        ----------------------------
        */

        if (action === "add-machine") {
            return machineDialog();
        }

        if (action === "edit-machine") {
            return machineDialog(id);
        }

        if (action === "toggle-maintenance") {
            return machineDialog(id);
        }

        /*
        ----------------------------
        AÇÕES DE ALOCAÇÕES
        ----------------------------
        */

        if (action === "add-booking") {
            return bookingDialog();
        }

        if (action === "edit-booking") {
            return bookingDialog(id);
        }

        if (action === "end-booking") {

            const confirmed = confirm(
                "Encerrar esta alocação e liberar o equipamento?"
            );

            if (!confirmed) {
                return;
            }

            const booking = d.bookings.find(
                (item) => item.id === id
            );

            if (!booking) {
                return;
            }

            booking.status = "encerrada";
            booking.endedAt = new Date().toISOString();

            A.write(d);

            render();

            A.toast("Alocação encerrada.");

            return;
        }

        /*
        ----------------------------
        AÇÕES DE SOLICITAÇÕES
        ----------------------------
        */

        if (action === "approve-request") {
            return approveDialog(id);
        }

        if (action === "notify-request") {
            return notifyDialog(id);
        }

        if (action === "reject-request") {

            const confirmed = confirm(
                "Recusar esta solicitação?"
            );

            if (!confirmed) {
                return;
            }

            const request = d.requests.find(
                (item) => item.id === id
            );

            if (!request || request.status !== "pendente") {
                return;
            }

            request.status = "recusado";
            request.decidedAt = new Date().toISOString();

            A.write(d);

            render();

            A.toast("Solicitação recusada.");

            return;
        }

        /*
        ----------------------------
        AÇÕES DE DEMONSTRAÇÃO
        ----------------------------
        */

        if (action === "reset-demo") {

            const confirmed = confirm(
                "Restaurar a demonstração? Pedidos e edições locais serão substituídos pelos dados de exemplo."
            );

            if (confirmed) {

                A.reset();

                showPage("dashboard");

                A.toast(
                    "Dados de demonstração restaurados."
                );
            }

            return;
        }

        /*
        ----------------------------
        NAVEGAÇÃO
        ----------------------------
        */

        if (action === "go-company") {
            return showPage("company");
        }

        if (action === "go-requests") {
            return showPage("requests");
        }

        if (action === "go-machines") {
            return showPage("machines");
        }
    }

    /*
    ========================================================
    9. MODAIS
    ========================================================
    */

    function openModal(content) {

        $("#adminModalBody").innerHTML = content;

        $("#adminModal").hidden = false;

        document.body.classList.add("modal-open");

        $("#adminModal")
            .querySelector("input,button")
            ?.focus();
    }

    function closeModal() {

        $("#adminModal").hidden = true;

        document.body.classList.remove("modal-open");
    }

    /*
    ========================================================
    10. CADASTRO E EDIÇÃO DE MÁQUINAS
    ========================================================
    */

    function machineDialog(id) {

        const d = A.load();

        const original = id
            ? d.machines.find((machine) => machine.id === id)
            : null;

        const machine = original || {
            name: "",
            category: "Escavação",
            type: "",
            brand: "",
            model: "",
            purpose: "",
            description: "",
            image: "retroescavadeira",
            origin: "propria",
            partner: "",
            partnerContact: "",
            quantity: 1,
            maintenanceQty: 0
        };

        const categoryOptions = machineCategories.map((category) => {

            const selected = (
                machine.category ||
                A.categoryFromType(machine.type)
            ) === category
                ? "selected"
                : "";

            return `
                <option
                    value="${category}"
                    ${selected}
                >
                    ${category}
                </option>
            `;

        }).join("");

        const imageOptions = [
            ["retroescavadeira", "Retroescavadeira"],
            ["trator-esteira", "Trator de esteira"],
            ["pa-carregadeira", "Pá carregadeira"],
            ["motoniveladora", "Motoniveladora"]
        ].map(([value, label]) => {

            const selected = machine.image === value
                ? "selected"
                : "";

            return `
                <option
                    value="${value}"
                    ${selected}
                >
                    ${label}
                </option>
            `;

        }).join("");

        const ownSelected = machine.origin === "propria"
            ? "selected"
            : "";

        const thirdPartySelected = machine.origin === "terceiros"
            ? "selected"
            : "";

        openModal(`

            <div class="modal-header">

                <div class="eyebrow eyebrow-soft">
                    GERENCIAMENTO DA FROTA
                </div>

                <h2>
                    ${original
                        ? "Editar equipamento"
                        : "Cadastrar equipamento"}
                </h2>

                <p>
                    Cadastre a máquina com marca, modelo,
                    categoria e uma explicação clara do que
                    ela faz no catálogo do cliente.
                </p>

            </div>

            <form id="machineForm">

                <div class="form-grid">

                    ${inp(
                        "Nome da máquina",
                        "name",
                        machine.name,
                        {
                            required: true,
                            full: true,
                            maxlength: 70
                        }
                    )}

                    <label class="field">

                        Categoria

                        <select name="category">
                            ${categoryOptions}
                        </select>

                    </label>

                    ${inp(
                        "Tipo / aplicação principal",
                        "type",
                        machine.type,
                        {
                            required: true,
                            maxlength: 60,
                            placeholder: "Ex.: escavação e apoio em obras"
                        }
                    )}

                    ${inp(
                        "Marca",
                        "brand",
                        machine.brand,
                        {
                            required: true,
                            maxlength: 60,
                            placeholder: "Ex.: Caterpillar"
                        }
                    )}

                    ${inp(
                        "Modelo",
                        "model",
                        machine.model,
                        {
                            required: true,
                            maxlength: 60,
                            placeholder: "Ex.: D6"
                        }
                    )}

                    <label class="field field-full">

                        Para que serve

                        <textarea
                            name="purpose"
                            rows="3"
                            required
                            maxlength="420"
                        >${A.safe(
                            machine.purpose ||
                            machine.description ||
                            ""
                        )}</textarea>

                    </label>

                    <label class="field field-full">

                        Descrição complementar

                        <textarea
                            name="description"
                            rows="3"
                            maxlength="500"
                        >${A.safe(
                            machine.description || ""
                        )}</textarea>

                    </label>

                    <label class="field">

                        Quantidade total de unidades

                        <input
                            type="number"
                            name="quantity"
                            min="1"
                            max="100"
                            value="${A.machineQty(machine)}"
                            required
                        >

                    </label>

                    <label class="field">

                        Unidades em manutenção

                        <input
                            type="number"
                            name="maintenanceQty"
                            min="0"
                            max="100"
                            value="${A.maintenanceQty(machine)}"
                            required
                        >

                    </label>

                    <label class="field">

                        Ilustração

                        <select name="image">
                            ${imageOptions}
                        </select>

                    </label>

                    <label class="field">

                        Propriedade

                        <select
                            name="origin"
                            id="originSelect"
                        >

                            <option
                                value="propria"
                                ${ownSelected}
                            >
                                Máquina própria
                            </option>

                            <option
                                value="terceiros"
                                ${thirdPartySelected}
                            >
                                Máquina de terceiros
                            </option>

                        </select>

                    </label>

                    <div
                        class="field-full partner-fields"
                        id="partnerFields"
                        ${machine.origin === "terceiros" ? "" : "hidden"}
                    >

                        ${inp(
                            "Proprietário parceiro",
                            "partner",
                            machine.partner,
                            {
                                full: true
                            }
                        )}

                        ${inp(
                            "Contato do parceiro",
                            "partnerContact",
                            machine.partnerContact,
                            {
                                optional: true,
                                full: true
                            }
                        )}

                    </div>

                </div>

                <p class="form-support">
                    Exemplo: 3 retroescavadeiras, sendo 1 em
                    manutenção = 2 unidades operacionais.
                    O catálogo exibirá marca, modelo,
                    categoria e explicação da finalidade.
                </p>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-outline"
                        data-admin-close
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        ${original
                            ? "Salvar alterações"
                            : "Cadastrar equipamento"} →
                    </button>

                </div>

            </form>
        `);

        // Exibe os dados do proprietário quando necessário
        $("#originSelect").addEventListener("change", (event) => {

            $("#partnerFields").hidden =
                event.target.value !== "terceiros";

        });

        // Salva o formulário
        $("#machineForm").addEventListener("submit", (event) => {

            event.preventDefault();

            const form = new FormData(event.currentTarget);

            const name = String(form.get("name") || "").trim();
            const category = String(form.get("category") || "").trim();
            const type = String(form.get("type") || "").trim();
            const brand = String(form.get("brand") || "").trim();
            const model = String(form.get("model") || "").trim();
            const purpose = String(form.get("purpose") || "").trim();
            const description = String(form.get("description") || "").trim();

            const origin = form.get("origin");

            const quantity = Number(form.get("quantity"));
            const maintenanceQty = Number(form.get("maintenanceQty"));

            // Campos obrigatórios
            if (!name || !type || !brand || !model || !purpose) {

                A.toast(
                    "Preencha os campos obrigatórios.",
                    "error"
                );

                return;
            }

            // Validação das quantidades
            const validQuantity =
                Number.isInteger(quantity) &&
                quantity >= 1 &&
                quantity <= 100;

            const validMaintenance =
                Number.isInteger(maintenanceQty) &&
                maintenanceQty >= 0 &&
                maintenanceQty <= quantity;

            if (!validQuantity || !validMaintenance) {

                A.toast(
                    "Quantidade total e manutenção precisam ser valores válidos.",
                    "error"
                );

                return;
            }

            const partner = String(
                form.get("partner") || ""
            ).trim();

            if (origin === "terceiros" && !partner) {

                A.toast(
                    "Informe o proprietário da máquina de terceiros.",
                    "error"
                );

                return;
            }

            // Impede reduzir capacidade abaixo das alocações
            if (original) {

                const peak = A.peakBooked(
                    id,
                    "0000-01-01",
                    "9999-12-31",
                    d
                );

                if (peak > quantity - maintenanceQty) {

                    A.toast(
                        `Há ${peak} unidade(s) simultaneamente reservadas. Não reduza a capacidade abaixo disso.`,
                        "error"
                    );

                    return;
                }
            }

            const next = {
                id: id || A.shortId("M"),
                name,
                category: category || A.categoryFromType(type),
                type,
                brand,
                model,
                purpose,
                description: description || purpose,
                image: String(form.get("image") || ""),
                origin,

                partner: origin === "terceiros"
                    ? partner
                    : "",

                partnerContact: origin === "terceiros"
                    ? String(form.get("partnerContact") || "").trim()
                    : "",

                quantity,
                maintenanceQty,
                maintenance: maintenanceQty === quantity
            };

            if (original) {
                Object.assign(original, next);
            } else {
                d.machines.unshift(next);
            }

            if (A.write(d)) {

                closeModal();

                render();

                A.toast(
                    original
                        ? "Equipamento atualizado."
                        : "Equipamento cadastrado."
                );
            }
        });
    }

    /*
    ========================================================
    11. CADASTRO E EDIÇÃO DE ALOCAÇÕES
    ========================================================
    */

    function bookingDialog(id) {

        const d = A.load();

        const original = id
            ? d.bookings.find((booking) => booking.id === id)
            : null;

        const booking = original || {

            machineId: d.machines.find(
                (machine) => A.capacity(machine) > 0
            )?.id || "",

            customer: "",
            contact: "",
            location: "",
            quantity: 1,
            start: A.dayISO(),
            end: A.dayISO(1)
        };

        const machineOptions = d.machines.map((machine) => {

            const selected = machine.id === booking.machineId
                ? "selected"
                : "";

            return `
                <option
                    value="${A.safe(machine.id)}"
                    ${selected}
                >
                    ${A.safe(machine.name)}
                    (${A.machineQty(machine)} un.)
                </option>
            `;

        }).join("");

        openModal(`

            <div class="modal-header">

                <div class="eyebrow eyebrow-soft">
                    AGENDA OPERACIONAL
                </div>

                <h2>
                    ${original
                        ? "Editar alocação"
                        : "Registrar alocação"}
                </h2>

                <p>
                    Informe a quantidade. O sistema não
                    permitirá ultrapassar a capacidade nas datas.
                </p>

            </div>

            <form id="bookingForm">

                <div class="form-grid">

                    <label class="field field-full">

                        Máquina

                        <select
                            name="machineId"
                            required
                        >
                            ${machineOptions}
                        </select>

                    </label>

                    ${inp(
                        "Cliente responsável",
                        "customer",
                        booking.customer,
                        {
                            full: true,
                            required: true,
                            maxlength: 90
                        }
                    )}

                    ${inp(
                        "Contato",
                        "contact",
                        booking.contact,
                        {
                            optional: true,
                            full: true,
                            maxlength: 22
                        }
                    )}

                    ${inp(
                        "Local de utilização",
                        "location",
                        booking.location,
                        {
                            required: true,
                            full: true,
                            maxlength: 130
                        }
                    )}

                    <label class="field">

                        Quantidade de unidades

                        <input
                            type="number"
                            name="quantity"
                            min="1"
                            max="100"
                            required
                            value="${A.safe(booking.quantity || 1)}"
                        >

                    </label>

                    ${inp(
                        "Início",
                        "start",
                        booking.start,
                        {
                            required: true,
                            type: "date",
                            min: original ? "" : A.dayISO()
                        }
                    )}

                    ${inp(
                        "Término",
                        "end",
                        booking.end,
                        {
                            required: true,
                            type: "date",
                            min: original ? "" : A.dayISO()
                        }
                    )}

                    <div
                        id="bookingAvailability"
                        class="field-full availability-note"
                        aria-live="polite"
                    ></div>

                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-outline"
                        data-admin-close
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        Salvar alocação →
                    </button>

                </div>

            </form>
        `);

        // Mostra a disponibilidade
        function hint() {

            const form = new FormData(
                $("#bookingForm")
            );

            const free = A.availableBetween(
                String(form.get("machineId")),
                String(form.get("start")),
                String(form.get("end")),
                A.load(),
                id || null
            );

            const quantity = Number(
                form.get("quantity")
            );

            $("#bookingAvailability").textContent =
                `${free} unidade(s) disponíveis durante todo o período.`;

            $("#bookingAvailability").classList.toggle(
                "availability-error",
                free < quantity
            );
        }

        $("#bookingForm").addEventListener("input", hint);

        hint();

        // Salvar alocação
        $("#bookingForm").addEventListener("submit", (event) => {

            event.preventDefault();

            const form = new FormData(
                event.currentTarget
            );

            const machineId = String(
                form.get("machineId")
            );

            const start = String(
                form.get("start")
            );

            const end = String(
                form.get("end")
            );

            const customer = String(
                form.get("customer") || ""
            ).trim();

            const location = String(
                form.get("location") || ""
            ).trim();

            const quantity = Number(
                form.get("quantity")
            );

            if (!customer || !location) {

                A.toast(
                    "Informe o cliente e o local.",
                    "error"
                );

                return;
            }

            const invalidPeriod =
                !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
                end < start ||
                (!original && start < A.dayISO());

            if (invalidPeriod) {

                A.toast(
                    "Período inválido.",
                    "error"
                );

                return;
            }

            const machine = d.machines.find(
                (item) => item.id === machineId
            );

            const invalidQuantity =
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > A.machineQty(machine || { quantity: 0 });

            if (!machine || invalidQuantity) {

                A.toast(
                    "Máquina ou quantidade inválida.",
                    "error"
                );

                return;
            }

            const free = A.availableBetween(
                machineId,
                start,
                end,
                d,
                id || null
            );

            if (free < quantity) {

                A.toast(
                    `Quantidade indisponível: restam ${free} unidade(s) nesse período.`,
                    "error"
                );

                return;
            }

            const next = {

                id: original?.id || A.shortId("A"),

                machineId,
                customer,

                contact: String(
                    form.get("contact") || ""
                ).trim(),

                location,
                quantity,
                start,
                end,

                status: "ativa",

                requestId: original?.requestId || null,

                createdAt: original?.createdAt ||
                    new Date().toISOString()
            };

            if (original) {
                Object.assign(original, next);
            } else {
                d.bookings.unshift(next);
            }

            if (A.write(d)) {

                closeModal();

                render();

                A.toast(
                    original
                        ? "Alocação atualizada."
                        : "Alocação registrada."
                );
            }
        });
    }

    /*
    ========================================================
    12. NOTIFICAÇÕES PELO WHATSAPP
    ========================================================
    */

    function notifyMessage(request, machine, company) {

        if (request.status === "aprovado") {

            return `
Olá, ${request.name}! ✅
Sua solicitação foi APROVADA pela ${company.name}.

Protocolo: ${request.id}
Equipamento: ${machine?.name || "Máquina"}
Quantidade: ${request.quantity || 1} unidade(s)
Período: ${A.brDate(request.start)} a ${A.brDate(request.end)}

A contratação foi confirmada. Em caso de dúvidas, fale conosco.
            `.trim();
        }

        return `
Olá, ${request.name}!
Sua solicitação ${request.id} para ${
    machine?.name || "o equipamento"
} (de ${A.brDate(request.start)} a ${
    A.brDate(request.end)
}) não pôde ser aprovada pela ${
    company.name
}. Entre em contato para consultar outras datas.
        `.trim();
    }

    function notifyDialog(id) {

        const d = A.load();

        const request = d.requests.find(
            (item) => item.id === id
        );

        const machine = d.machines.find(
            (item) => item.id === request?.machineId
        );

        if (!request || request.status === "pendente") {

            A.toast(
                "Conclua a análise antes de notificar o cliente.",
                "error"
            );

            return;
        }

        const link = A.waLink(
            request.phone,
            notifyMessage(request, machine, d.company)
        );

        const phoneLength = A.phoneDigits(
            request.phone
        ).length;

        const valid = [10, 11, 12, 13].includes(
            phoneLength
        );

        const whatsappButton = link && valid

            ? `
                <a
                    class="btn btn-primary"
                    href="${A.safe(link)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${A.ico("phone", 17)}
                    Abrir WhatsApp e notificar ↗
                </a>
            `

            : `
                <span class="availability-note availability-error">
                    Número do cliente inválido.
                    Corrija o cadastro para notificar.
                </span>
            `;

        openModal(`

            <div class="modal-header">

                <div class="eyebrow eyebrow-soft">
                    COMUNICAÇÃO COM O CLIENTE
                </div>

                <h2>Notificar cliente</h2>

                <p>
                    A notificação é preparada automaticamente,
                    mas o envio é
                    <strong>manual pelo WhatsApp</strong>.
                </p>

            </div>

            <div class="approval-summary">

                <div>
                    <span>Cliente</span>
                    <b>${A.safe(request.name)}</b>
                </div>

                <div>
                    <span>Equipamento</span>
                    <b>
                        ${A.safe(
                            machine?.name || "Equipamento"
                        )}
                    </b>
                </div>

                <div>
                    <span>Quantidade</span>
                    <b>
                        ${A.safe(request.quantity || 1)}
                        unidade(s)
                    </b>
                </div>

                <div>
                    <span>Situação</span>
                    <b>
                        ${request.status === "aprovado"
                            ? "Aprovada"
                            : "Recusada"}
                    </b>
                </div>

                <div>
                    <span>Telefone</span>
                    <b>${A.safe(request.phone)}</b>
                </div>

            </div>

            <p class="form-support">
                Clique para abrir a conversa e depois
                pressione <strong>Enviar</strong> no WhatsApp.
                O protótipo não sabe se a mensagem foi entregue.
            </p>

            <div class="modal-actions">

                <button
                    type="button"
                    class="btn btn-outline"
                    data-admin-close
                >
                    Voltar
                </button>

                ${whatsappButton}

            </div>
        `);
    }

    /*
    ========================================================
    13. APROVAÇÃO DE SOLICITAÇÕES
    ========================================================
    */

    function approveDialog(id) {

        const d = A.load();

        const request = d.requests.find(
            (item) => item.id === id
        );

        if (!request || request.status !== "pendente") {
            return;
        }

        const machine = d.machines.find(
            (item) => item.id === request.machineId
        );

        if (!machine) {

            A.toast(
                "Máquina não encontrada.",
                "error"
            );

            return;
        }

        const available = A.availableBetween(
            request.machineId,
            request.start,
            request.end,
            d
        );

        openModal(`

            <div class="modal-header">

                <div class="eyebrow eyebrow-soft">
                    CONFIRMAR SOLICITAÇÃO
                </div>

                <h2>
                    Aprovar pedido ${A.safe(request.id)}
                </h2>

                <p>
                    Aprovar cria uma alocação e compromete
                    ${A.safe(request.quantity || 1)}
                    unidade(s) nas datas solicitadas.
                </p>

            </div>

            <div class="approval-summary">

                <div>
                    <span>Cliente</span>
                    <b>${A.safe(request.name)}</b>
                </div>

                <div>
                    <span>Máquina</span>
                    <b>${A.safe(machine.name)}</b>
                </div>

                <div>
                    <span>Quantidade solicitada</span>
                    <b>
                        ${A.safe(request.quantity || 1)}
                        unidade(s)
                    </b>
                </div>

                <div>
                    <span>Livres no período</span>
                    <b>${available} unidade(s)</b>
                </div>

                <div>
                    <span>Período</span>
                    <b>
                        ${A.brDate(request.start)}
                        a
                        ${A.brDate(request.end)}
                    </b>
                </div>

                <div>
                    <span>Contato</span>
                    <b>${A.safe(request.phone)}</b>
                </div>

            </div>

            <form id="approveForm">

                <div class="form-grid">

                    ${inp(
                        "Local de utilização",
                        "location",
                        request.location,
                        {
                            full: true,
                            required: true,
                            placeholder: "Obra / endereço"
                        }
                    )}

                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-outline"
                        data-admin-close
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        Confirmar aprovação →
                    </button>

                </div>

            </form>
        `);

        $("#approveForm").addEventListener("submit", (event) => {

            event.preventDefault();

            const form = new FormData(
                event.currentTarget
            );

            const location = String(
                form.get("location") || ""
            ).trim();

            if (!location) {

                A.toast(
                    "Informe o local de utilização.",
                    "error"
                );

                return;
            }

            // Recarrega os dados antes da aprovação
            const fresh = A.load();

            const req = fresh.requests.find(
                (item) => item.id === id
            );

            const machine = fresh.machines.find(
                (item) => item.id === req?.machineId
            );

            if (!req || req.status !== "pendente" || !machine) {

                A.toast(
                    "Pedido já foi processado.",
                    "error"
                );

                return;
            }

            if (req.end < A.dayISO()) {

                A.toast(
                    "O período solicitado já passou. Solicite novas datas.",
                    "error"
                );

                return;
            }

            const free = A.availableBetween(
                req.machineId,
                req.start,
                req.end,
                fresh
            );

            const quantity = Number(
                req.quantity
            ) || 1;

            if (free < quantity) {

                A.toast(
                    `Não é possível aprovar: apenas ${free} unidade(s) livres nas datas.`,
                    "error"
                );

                return;
            }

            const booking = {

                id: A.shortId("A"),

                machineId: req.machineId,

                customer: req.name,
                contact: req.phone,

                location,

                quantity,

                start: req.start,
                end: req.end,

                status: "ativa",

                requestId: req.id,

                createdAt: new Date().toISOString()
            };

            // Registra a alocação
            fresh.bookings.unshift(booking);

            // Atualiza o pedido
            req.status = "aprovado";
            req.decidedAt = new Date().toISOString();

            if (A.write(fresh)) {

                render();

                A.toast(
                    "Pedido aprovado! Agora notifique o cliente."
                );

                notifyDialog(id);
            }
        });
    }

    /*
    ========================================================
    14. SALVAMENTO DAS INFORMAÇÕES DA EMPRESA
    ========================================================
    */

    function wireCompany() {

        const company = A.load().company;

        modalLogo = company.logo;

        /*
        ----------------------------
        UPLOAD DA LOGOMARCA
        ----------------------------
        */

        $("#logoInput").addEventListener("change", async (event) => {

            const file = event.target.files?.[0];

            if (!file) {
                return;
            }

            const validSize = file.size <= 5 * 1024 * 1024;

            const validType = [
                "image/png",
                "image/jpeg",
                "image/webp"
            ].includes(file.type);

            if (!validSize || !validType) {

                A.toast(
                    "Use uma imagem PNG, JPG ou WebP de até 5 MB.",
                    "error"
                );

                event.target.value = "";

                return;
            }

            try {

                const newLogo = await compressLogo(file);

                modalLogo = newLogo;

                $("#companyLogoPreview").src = newLogo;

                A.toast(
                    "Prévia da logomarca atualizada. Clique em Salvar alterações."
                );

            } catch (error) {

                A.toast(
                    "Não foi possível processar a imagem.",
                    "error"
                );
            }
        });

        /*
        ----------------------------
        REMOVER LOGOMARCA PERSONALIZADA
        ----------------------------
        */

        $("#clearLogo").addEventListener("click", () => {

            modalLogo = "assets/logo-generica.svg";

            $("#companyLogoPreview").src = modalLogo;

        });

        /*
        ----------------------------
        SALVAR DADOS DA EMPRESA
        ----------------------------
        */

        $("#companyForm").addEventListener("submit", (event) => {

            event.preventDefault();

            const form = new FormData(
                event.currentTarget
            );

            const d = A.load();

            const name = String(
                form.get("name") || ""
            ).trim();

            const city = String(
                form.get("city") || ""
            ).trim();

            const state = String(
                form.get("state") || ""
            ).trim().toUpperCase();

            // Validação dos campos obrigatórios
            if (!name || !city || state.length !== 2) {

                A.toast(
                    "Preencha nome, cidade e UF (2 letras).",
                    "error"
                );

                return;
            }

            const whatsapp = String(
                form.get("whatsapp") || ""
            ).trim();

            // Validação do WhatsApp
            if (
                whatsapp &&
                ![10, 11, 12, 13].includes(
                    A.phoneDigits(whatsapp).length
                )
            ) {

                A.toast(
                    "WhatsApp inválido. Informe DDD e número.",
                    "error"
                );

                return;
            }

            // Atualiza o objeto da empresa
            d.company = {

                ...d.company,

                name,

                tagline: String(
                    form.get("tagline") || ""
                ).trim(),

                description: String(
                    form.get("description") || ""
                ).trim(),

                city,
                state,

                address: String(
                    form.get("address") || ""
                ).trim(),

                phone: String(
                    form.get("phone") || ""
                ).trim(),

                whatsapp,

                email: String(
                    form.get("email") || ""
                ).trim(),

                brand: String(
                    form.get("brand") || "#278445"
                ),

                logo: modalLogo
            };

            if (A.write(d)) {

                render();

                A.toast(
                    "Perfil da empresa salvo. Confira no portal público."
                );
            }
        });
    }

    /*
    ========================================================
    15. PROCESSAMENTO DE IMAGENS
    ========================================================
    */

    function compressLogo(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onerror = reject;

            reader.onload = () => {

                const image = new Image();

                image.onload = () => {

                    const scale = Math.min(
                        1,
                        420 / image.width,
                        300 / image.height
                    );

                    const canvas = document.createElement(
                        "canvas"
                    );

                    canvas.width = Math.max(
                        1,
                        Math.round(image.width * scale)
                    );

                    canvas.height = Math.max(
                        1,
                        Math.round(image.height * scale)
                    );

                    const context = canvas.getContext("2d");

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    resolve(
                        canvas.toDataURL("image/png")
                    );
                };

                image.onerror = reject;

                image.src = reader.result;
            };

            reader.readAsDataURL(file);
        });
    }

    /*
    ========================================================
    16. INICIALIZAÇÃO DO PAINEL
    ========================================================
    */

    function init() {

        /*
        ----------------------------
        ÍCONES DO MENU
        ----------------------------
        */

        document.querySelectorAll("[data-sicon]").forEach((element) => {

            const icon = boxIcon[element.dataset.sicon] || "info";

            element.innerHTML = A.ico(icon, 19);

        });

        /*
        ----------------------------
        LOGIN DEMONSTRATIVO
        ----------------------------
        */

        $("#loginForm").addEventListener("submit", (event) => {

            event.preventDefault();

            const form = new FormData(
                event.currentTarget
            );

            const email = form.get("email");
            const password = form.get("password");

            if (
                email === "admin@alloclink.demo" &&
                password === "demo123"
            ) {

                sessionStorage.setItem(
                    "alloc_demo_auth",
                    "1"
                );

                loginView();

                A.toast(
                    "Bem-vindo à demonstração do Alloc Link."
                );

            } else {

                A.toast(
                    "Credenciais de demonstração incorretas.",
                    "error"
                );
            }
        });

        /*
        ----------------------------
        SAIR DO PAINEL
        ----------------------------
        */

        $("#logoutBtn").addEventListener("click", () => {

            sessionStorage.removeItem(
                "alloc_demo_auth"
            );

            window.AllocProfile.atualizarMenu();

            loginView();
        });

        /*
        ----------------------------
        NAVEGAÇÃO DO MENU
        ----------------------------
        */

        document.querySelectorAll("[data-view]").forEach((element) => {

            element.addEventListener("click", () => {

                showPage(
                    element.dataset.view
                );

            });

        });

        /*
        ----------------------------
        MENU LATERAL
        ----------------------------
        */

        $("#toggleSidebar").addEventListener("click", () => {

            $("#adminSidebar").classList.toggle(
                "open"
            );

        });

        /*
        ----------------------------
        FECHAMENTO DOS MODAIS
        ----------------------------
        */

        $("#adminModal").addEventListener("click", (event) => {

            const clickedOutside = event.target === $("#adminModal");

            const clickedClose = event.target.closest(
                "[data-admin-close]"
            );

            if (clickedOutside || clickedClose) {
                closeModal();
            }
        });

        /*
        ----------------------------
        TECLA ESC
        ----------------------------
        */

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {

                if (!$("#adminModal").hidden) {
                    closeModal();
                }

                $("#adminSidebar").classList.remove(
                    "open"
                );
            }
        });

        /*
        ----------------------------
        ATUALIZAÇÃO ENTRE ABAS
        ----------------------------
        */

        window.addEventListener("storage", (event) => {

            if (event.key === "alloclink_app_demo_v1") {
                location.reload();
            }
        });

        /*
        ----------------------------
        INICIAR A INTERFACE
        ----------------------------
        */

        loginView();
    }

    // Executa após o HTML estar carregado
    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();
