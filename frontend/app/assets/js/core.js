
/*
 * Alloc Link — MVP demonstrativo
 * Dados locais, sem servidor.
 */

(function () {
    'use strict';

    // Armazenamento local
    const STORAGE_KEY = 'alloclink_app_demo_v1';
    const OLD_KEYS = [''];

    // Categorias de equipamentos
    const CATEGORY_OPTIONS = [
        'Escavação',
        'Terraplenagem',
        'Carga e movimentação',
        'Nivelamento'
    ];

    // Retorna uma data no formato AAAA-MM-DD
    const dayISO = (shift = 0) => {
        const d = new Date();

        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + shift);

        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    };

    // Identifica a categoria pelo tipo da máquina
    const categoryFromType = (type = '') => {
        const t = String(type || '').toLowerCase();

        if (t.includes('escava')) {
            return 'Escavação';
        }

        if (
            t.includes('terraplen') ||
            t.includes('solo') ||
            t.includes('esteira')
        ) {
            return 'Terraplenagem';
        }

        if (
            t.includes('carreg') ||
            t.includes('movimenta') ||
            t.includes('carga')
        ) {
            return 'Carga e movimentação';
        }

        if (t.includes('nivel')) {
            return 'Nivelamento';
        }

        return 'Operação geral';
    };

    /*
    ========================================================
    1. ESTADO INICIAL E NORMALIZAÇÃO DOS DADOS
    ========================================================
    */

    // Estado inicial vazio, pronto para a futura integração
    const seed = () => ({
        company: {
            name: '',
            tagline: '',
            description: '',
            city: '',
            state: '',
            address: '',
            phone: '',
            whatsapp: '',
            email: '',
            brand: '#278445',
            logo: ''
        },

        machines: [],
        bookings: [],
        requests: []
    });

    function normalize(d) {
        d.machines.forEach((m) => {
            m.category = String(
                m.category || categoryFromType(m.type)
            ).trim() || 'Operação geral';

            m.brand = String(
                m.brand || 'Marca não informada'
            ).trim();

            m.model = String(
                m.model || 'Modelo não informado'
            ).trim();

            m.purpose = String(
                m.purpose ||
                m.description ||
                m.type ||
                'Finalidade não informada'
            ).trim();

            m.description = String(
                m.description || m.purpose || ''
            ).trim();

            m.type = String(
                m.type || m.category
            ).trim() || m.category;

            m.quantity =
                Number.isInteger(Number(m.quantity)) &&
                Number(m.quantity) > 0
                    ? Number(m.quantity)
                    : 1;

            m.maintenanceQty = m.maintenanceQty === undefined
                ? (m.maintenance ? m.quantity : 0)
                : Math.max(
                    0,
                    Math.min(
                        m.quantity,
                        Number(m.maintenanceQty) || 0
                    )
                );

            m.maintenance = m.maintenanceQty >= m.quantity;
        });

        d.bookings.forEach((b) => {
            b.quantity =
                Number.isInteger(Number(b.quantity)) &&
                Number(b.quantity) > 0
                    ? Number(b.quantity)
                    : 1;
        });

        d.requests.forEach((r) => {
            r.quantity =
                Number.isInteger(Number(r.quantity)) &&
                Number(r.quantity) > 0
                    ? Number(r.quantity)
                    : 1;
        });

        return d;
    }

    /*
    ========================================================
    2. LEITURA E GRAVAÇÃO NO LOCALSTORAGE
    ========================================================
    */

    let cache;

    function load() {
        if (cache) {
            return cache;
        }

        try {
            let raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                for (const key of OLD_KEYS) {
                    raw = localStorage.getItem(key);

                    if (raw) {
                        break;
                    }
                }
            }

            if (raw) {
                const parsed = JSON.parse(raw);

                if (
                    parsed?.company &&
                    Array.isArray(parsed.machines) &&
                    Array.isArray(parsed.requests) &&
                    Array.isArray(parsed.bookings)
                ) {
                    cache = normalize(parsed);

                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(cache)
                    );

                    return cache;
                }
            }
        } catch (e) {
            console.warn(
                'Dados locais não puderam ser lidos.',
                e
            );
        }

        cache = normalize(seed());

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(cache)
            );
        } catch (e) {
            // Continua usando os dados em memória.
        }

        return cache;
    }

    function write(data) {
        cache = data;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch (e) {
            alert(
                'O navegador não conseguiu salvar os dados da demonstração. ' +
                'Reduza a imagem da logo ou libere espaço.'
            );

            return false;
        }

        window.dispatchEvent(
            new Event('alloclink:change')
        );

        return true;
    }

    function reset() {
        cache = seed();
        write(cache);
    }

    /*
    ========================================================
    3. FUNÇÕES AUXILIARES
    ========================================================
    */

    // Protege textos inseridos em HTML
    const safe = (v) => String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );

    // Formata data para o padrão brasileiro
    const brDate = (iso) => iso
        ? new Date(
            iso + 'T12:00:00'
        ).toLocaleDateString('pt-BR')
        : '—';

    // Verifica se dois períodos se sobrepõem
    const rangesOverlap = (a, b, c, d) => {
        return a <= d && c <= b;
    };

    // Quantidade total de unidades de uma máquina
    const machineQty = (m) => Math.max(
        1,
        Number(m.quantity) || 1
    );

    // Quantidade de unidades em manutenção
    const maintenanceQty = (m) => Math.min(
        machineQty(m),
        Math.max(
            0,
            Number(
                m.maintenanceQty ??
                (m.maintenance ? machineQty(m) : 0)
            ) || 0
        )
    );

    // Capacidade operacional, descontando manutenção
    const capacity = (m) => Math.max(
        0,
        machineQty(m) - maintenanceQty(m)
    );

    // Retorna o dia seguinte
    const following = (iso) => {
        const d = new Date(iso + 'T12:00:00');

        d.setDate(d.getDate() + 1);

        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    };

    /*
    ========================================================
    4. DISPONIBILIDADE E CONTROLE DE ALOCAÇÕES
    ========================================================

    As datas são inclusivas.

    Para calcular o máximo de unidades utilizadas,
    somamos as unidades no início de uma alocação e
    subtraímos no dia seguinte ao seu término.
    */

    function peakBooked(
        machineId,
        start,
        end,
        state = load(),
        ignoreBookingId = null
    ) {
        const changes = new Map();

        for (const b of state.bookings) {
            if (
                b.machineId !== machineId ||
                b.status !== 'ativa' ||
                b.id === ignoreBookingId ||
                !rangesOverlap(
                    start,
                    end,
                    b.start,
                    b.end
                )
            ) {
                continue;
            }

            const first = b.start > start
                ? b.start
                : start;

            const last = b.end < end
                ? b.end
                : end;

            const q = Number(b.quantity) || 1;

            changes.set(
                first,
                (changes.get(first) || 0) + q
            );

            const after = following(last);

            changes.set(
                after,
                (changes.get(after) || 0) - q
            );
        }

        let used = 0;
        let max = 0;

        for (const day of [...changes.keys()].sort()) {
            used += changes.get(day);
            max = Math.max(max, used);
        }

        return max;
    }

    /*
    --------------------------------------------------------
    DISPONIBILIDADE ENTRE DUAS DATAS
    --------------------------------------------------------
    */

    function availableBetween(
        machineId,
        start,
        end,
        state = load(),
        ignoreBookingId = null
    ) {
        const machine = state.machines.find(
            (m) => m.id === machineId
        );

        if (
            !machine ||
            !start ||
            !end ||
            end < start
        ) {
            return 0;
        }

        return Math.max(
            0,
            capacity(machine) - peakBooked(
                machineId,
                start,
                end,
                state,
                ignoreBookingId
            )
        );
    }

    /*
    --------------------------------------------------------
    VERIFICAÇÃO DE CONFLITO
    --------------------------------------------------------
    */

    function findConflict(
        machineId,
        start,
        end,
        state = load(),
        ignoreBookingId = null,
        requestedQty = 1
    ) {
        const available = availableBetween(
            machineId,
            start,
            end,
            state,
            ignoreBookingId
        );

        return available >= requestedQty
            ? null
            : {
                id: 'CAPACIDADE',
                available,
                start,
                end
            };
    }

    /*
    --------------------------------------------------------
    QUANTIDADE DE UNIDADES EM USO
    --------------------------------------------------------
    */

    function currentUsage(
        m,
        state = load(),
        when = dayISO()
    ) {
        return state.bookings
            .filter((b) => (
                b.machineId === m.id &&
                b.status === 'ativa' &&
                b.start <= when &&
                b.end >= when
            ))
            .reduce(
                (sum, b) => sum + (Number(b.quantity) || 1),
                0
            );
    }

    /*
    --------------------------------------------------------
    SITUAÇÃO ATUAL DA MÁQUINA
    --------------------------------------------------------
    */

    function machineStatus(m, state = load()) {
        const total = machineQty(m);
        const maint = maintenanceQty(m);

        const used = currentUsage(m, state);

        const free = Math.max(
            0,
            total - maint - used
        );

        const next = state.bookings
            .filter((b) => (
                b.machineId === m.id &&
                b.status === 'ativa' &&
                b.start > dayISO()
            ))
            .sort(
                (a, b) => a.start.localeCompare(b.start)
            )[0];

        // Todas as unidades estão em manutenção
        if (maint === total) {
            return {
                key: 'manutencao',
                text: 'Em manutenção',
                hint: `${total} unidade(s) em manutenção`,
                total,
                maint,
                used,
                free
            };
        }

        // Não existe unidade livre agora
        if (free === 0) {
            return {
                key: 'alocada',
                text: 'Ocupada',
                hint: `${used} de ${total} unidade(s) em uso • ${maint} em manutenção`,
                total,
                maint,
                used,
                free
            };
        }

        // Existe pelo menos uma unidade disponível
        return {
            key: 'disponivel',
            text: 'Disponível',

            hint: `${free} de ${total} unidade(s) livres agora` +
                (next
                    ? ` • Próxima reserva ${brDate(next.start)}`
                    : ''),

            total,
            maint,
            used,
            free
        };
    }

    /*
    ========================================================
    5. IMAGENS E IDENTIDADE VISUAL
    ========================================================
    */

    // Identifica a ilustração da máquina
    const assetFor = (m) => {
        const supportedImages = [
            'retroescavadeira',
            'trator-esteira',
            'pa-carregadeira',
            'motoniveladora'
        ];

        const image = supportedImages.includes(m.image)
            ? m.image
            : 'retroescavadeira';

        return 'assets/' + image + '.svg';
    };

    /*
    --------------------------------------------------------
    LOGOMARCA DA EMPRESA
    --------------------------------------------------------
    */

    function logoFor(s) {
        const validData = /^data:image\/(png|jpeg|webp);base64,/.test(
            s || ''
        );

        const validAsset = /^assets\//.test(
            s || ''
        );

        return validData || validAsset
            ? s
            : 'assets/logo-generica.svg';
    }

    /*
    --------------------------------------------------------
    APLICAR INFORMAÇÕES E CORES DA EMPRESA
    --------------------------------------------------------
    */

    function applyBrand() {
        const c = load().company;

        // Cor principal
        document.documentElement.style.setProperty(
            '--brand',
            c.brand || '#278445'
        );

        // Nome da empresa
        document
            .querySelectorAll('[data-company-name]')
            .forEach((n) => {
                n.textContent =
                    c.name || 'Empresa não cadastrada';
            });

        // Logomarca
        document
            .querySelectorAll('[data-company-logo]')
            .forEach((n) => {
                n.src = logoFor(c.logo);

                n.alt = 'Logo da empresa ' + c.name;
            });

        // Localização
        document
            .querySelectorAll('[data-company-city]')
            .forEach((n) => {
                n.textContent = [
                    c.city,
                    c.state
                ]
                    .filter(Boolean)
                    .join(' / ') ||
                    'Localização não cadastrada';
            });

        // Descrição
        document
            .querySelectorAll('[data-company-description]')
            .forEach((n) => {
                n.textContent =
                    c.description ||
                    c.tagline ||
                    'As informações da empresa aparecerão aqui.';
            });

        // Título da página
        const pageTitle = document.body?.dataset?.admin
            ? 'Administração'
            : 'Máquinas para locação';

        document.title =
            pageTitle +
            ' | ' +
            c.name +
            ' • Alloc Link';
    }

    /*
    ========================================================
    6. IDENTIFICADORES, TELEFONE E DATAS
    ========================================================
    */

    // Gera um identificador curto para registros locais
    const shortId = (prefix) => {
        return prefix + Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase();
    };

    // Mantém apenas os dígitos de um telefone
    const phoneDigits = (s) => {
        return String(s || '').replace(/\D/g, '');
    };

    /*
    --------------------------------------------------------
    LINK DO WHATSAPP
    --------------------------------------------------------
    */

    function waLink(phone, message) {
        const digits = phoneDigits(phone);

        if (!digits) {
            return null;
        }

        const number = digits.startsWith('55')
            ? digits
            : '55' + digits;

        return (
            'https://wa.me/' +
            number +
            '?text=' +
            encodeURIComponent(message)
        );
    }

    /*
    --------------------------------------------------------
    VALIDAÇÃO DE PERÍODO
    --------------------------------------------------------
    */

    function validDates(start, end) {
        return (
            /^\d{4}-\d{2}-\d{2}$/.test(start) &&
            /^\d{4}-\d{2}-\d{2}$/.test(end) &&
            start >= dayISO() &&
            end >= start
        );
    }

    /*
    ========================================================
    7. BIBLIOTECA DE ÍCONES SVG
    ========================================================
    */

    const icons = {
        search:
            '<circle cx="11" cy="11" r="7"/>' +
            '<path d="m20 20-4-4"/>',

        menu:
            '<path d="M4 7h16M4 12h16M4 17h16"/>',

        x:
            '<path d="M18 6 6 18M6 6l12 12"/>',

        arrow:
            '<path d="M5 12h14m-6-6 6 6-6 6"/>',

        arrowUp:
            '<path d="M7 17 17 7M8 7h9v9"/>',

        check:
            '<path d="m4 12 5 5L20 6"/>',

        checkcircle:
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="m7.5 12 3 3 6-6"/>',

        calendar:
            '<rect x="3" y="5" width="18" height="16" rx="2"/>' +
            '<path d="M7 3v4M17 3v4M3 10h18"/>',

        truck:
            '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7"/>' +
            '<circle cx="7" cy="18" r="2"/>' +
            '<circle cx="18" cy="18" r="2"/>',

        machine:
            '<rect x="3" y="11" width="14" height="6" rx="1"/>' +
            '<path d="M6 11V7h6v4m5 2 3-4M3 17h18"/>' +
            '<circle cx="7" cy="19" r="2"/>' +
            '<circle cx="17" cy="19" r="2"/>',

        clock:
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M12 7v5l3 2"/>',

        pin:
            '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/>' +
            '<circle cx="12" cy="10" r="2.5"/>',

        shield:
            '<path d="m12 22 8-4V6l-8-4-8 4v12z"/>' +
            '<path d="m8 12 3 3 5-6"/>',

        building:
            '<rect x="4" y="3" width="16" height="18" rx="2"/>' +
            '<path d="M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-5h4v5"/>',

        settings:
            '<path d="M10 3h4l1 3 2 1 3-1 2 4-3 2v2l3 2-2 4 3 1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 3-2v-2l-3-2 2-4 3 1 2-1z"/>' +
            '<circle cx="12" cy="12" r="3"/>',

        inbox:
            '<path d="M4 4h16v11l-3 5H7l-3-5V4Z"/>' +
            '<path d="M4 14h5l2 3h2l2-3h5"/>',

        plus:
            '<path d="M12 5v14M5 12h14"/>',

        edit:
            '<path d="M13 6 18 11 8 21H3v-5L13 6ZM15 4l2-2 5 5-2 2"/>',

        upload:
            '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',

        external:
            '<rect x="4" y="7" width="13" height="13" rx="2"/>' +
            '<path d="M13 4h7v7m0-7-9 9"/>',

        alert:
            '<path d="m12 3 10 18H2L12 3Z"/>' +
            '<path d="M12 9v4m0 4v.2"/>',

        info:
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M12 11v6m0-10v.3"/>',

        phone:
            '<path d="M6 3h4l2 5-3 2a16 16 0 0 0 5 5l2-3 5 2v4c0 2-2 3-4 3A16 16 0 0 1 3 7c0-2 1-4 3-4Z"/>',

        mail:
            '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
            '<path d="m3 7 9 6 9-6"/>',

        list:
            '<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',

        chevron:
            '<path d="m9 18 6-6-6-6"/>',

        logout:
            '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M13 7l5 5-5 5M8 12h10"/>',

        filter:
            '<path d="M4 6h16M7 12h10m-7 6h4"/>',

        layers:
            '<path d="m12 2 10 6-10 6L2 8l10-6Zm-10 11 10 6 10-6M2 18l10 5 10-5"/>',

        lock:
            '<rect x="4" y="11" width="16" height="10" rx="2"/>' +
            '<path d="M8 11V7a4 4 0 0 1 8 0v4"/>',

        refresh:
            '<path d="M20 7V3l-4 4h4zM4 17v4l4-4H4zM5 9a7 7 0 0 1 13-2M19 15a7 7 0 0 1-13 2"/>',

        eye:
            '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/>' +
            '<circle cx="12" cy="12" r="3"/>',

        user:
            '<circle cx="12" cy="8" r="4"/>' +
            '<path d="M4 21a8 8 0 0 1 16 0"/>',

        spark:
            '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>'
    };

    /*
    --------------------------------------------------------
    GERAR ÍCONE SVG
    --------------------------------------------------------
    */

    function ico(k, size = 19) {
        return (
            '<svg class="ico"' +
            ' width="' + size + '"' +
            ' height="' + size + '"' +
            ' viewBox="0 0 24 24"' +
            ' fill="none"' +
            ' stroke="currentColor"' +
            ' stroke-width="1.85"' +
            ' stroke-linecap="round"' +
            ' stroke-linejoin="round"' +
            ' aria-hidden="true">' +
            (icons[k] || icons.info) +
            '</svg>'
        );
    }

    /*
    ========================================================
    8. NOTIFICAÇÕES VISUAIS
    ========================================================
    */

    function toast(text, kind = 'ok') {
        let t = document.querySelector('#toast');

        // Cria o elemento de notificação, caso não exista
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';

            document.body.appendChild(t);
        }

        // Define o tipo e o conteúdo da notificação
        t.className = 'toast visible ' + kind;

        t.innerHTML =
            ico(kind === 'error' ? 'alert' : 'checkcircle') +
            ' <span>' +
            safe(text) +
            '</span>';

        // Cancela o fechamento anterior
        clearTimeout(t._h);

        // Fecha a notificação após 3,7 segundos
        t._h = setTimeout(() => {
            t.classList.remove('visible');
        }, 3700);
    }

    /*
    ========================================================
    9. FUNÇÕES DISPONÍVEIS PARA OUTROS ARQUIVOS
    ========================================================
    */

    window.Alloc = {
        load,
        write,
        reset,
        dayISO,
        brDate,
        rangesOverlap,
        findConflict,
        availableBetween,
        peakBooked,
        machineQty,
        maintenanceQty,
        capacity,
        currentUsage,
        machineStatus,
        assetFor,
        logoFor,
        applyBrand,
        shortId,
        phoneDigits,
        waLink,
        validDates,
        ico,
        safe,
        toast,
        categoryFromType,
        CATEGORY_OPTIONS
    };

})();
