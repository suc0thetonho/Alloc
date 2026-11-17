(function () {
    "use strict";
    if (!window.AllocConfig?.apiBaseUrl) {
        throw new Error("Carregue config.js antes de api.js.");
    }
    const BASE_URL = window.AllocConfig.apiBaseUrl.replace(/\/+$/, "");
    const TIMEOUT = window.AllocConfig.requestTimeoutMs || 15000;

    // Função reutilizável para requisições HTTP.
    async function request(path, options = {}) {
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT);

        let response;

        try {
            response = await fetch(`${BASE_URL}${path}`, {
                method: options.method || "GET",

                headers: {
                    ...(options.body !== undefined
                        ? { "Content-Type": "application/json" }
                        : {})
                },

                credentials: "include",
                signal: controller.signal,

                body: options.body !== undefined
                    ? JSON.stringify(options.body)
                    : undefined
            });

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("O servidor demorou para responder.");
            }

            throw new Error("Não foi possível conectar ao servidor.");

        } finally {
            clearTimeout(timeout);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        let data = null;

        if (contentType.includes("application/json")) {
            try {
                data = await response.json();
            } catch {
                throw new Error("O servidor retornou JSON inválido.");
            }
        }

        if (!response.ok) {
            const message =
                data?.message ||
                data?.mensagem ||
                (typeof data?.error === "string"
                    ? data.error
                    : data?.error?.message) ||
                `Erro HTTP ${response.status}`;

            const error = new Error(message);
            error.status = response.status;

            throw error;
        }

        return data;
    }

    // Funções que o Frontend utilizará na integração.
    window.AllocApi = {
        // Autenticação
        login: (data) =>
            request("/auth/login", {
                method: "POST",
                body: data
            }),

        logout: () =>
            request("/auth/logout", {
                method: "POST"
            }),

        getSession: () =>
            request("/auth/me"),

        // Empresa pública
        getPublicCompany: () =>
            request("/publico/empresa"),

        // Disponibilidade
        getAvailability: (id, start, end) => {
            const params = new URLSearchParams({ start, end });

            return request(
                `/maquinas/${encodeURIComponent(id)}/disponibilidade?${params}`
            );
        },

        // Aprovação e recusa de solicitações
        approveRequest: (id, data) =>
            request(`/solicitacoes/${encodeURIComponent(id)}/aprovar`, {
                method: "POST",
                body: data
            }),

        rejectRequest: (id) =>
            request(`/solicitacoes/${encodeURIComponent(id)}/recusar`, {
                method: "POST"
            }),

        // Edição e encerramento de alocações
        updateBooking: (id, data) =>
            request(`/alocacoes/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: data
            }),

        endBooking: (id) =>
            request(`/alocacoes/${encodeURIComponent(id)}/encerrar`, {
                method: "POST"
            }),
        // Empresa
        getCompany: () =>
            request("/empresas/me"),

        updateCompany: (data) =>
            request("/empresas/me", {
                method: "PUT",
                body: data
            }),

        // Administrador
        getProfile: () =>
            request("/usuarios/me"),

        updateProfile: (data) =>
            request("/usuarios/me", {
                method: "PUT",
                body: data
            }),

        // Máquinas
        getMachines: () =>
            request("/maquinas"),

        createMachine: (data) =>
            request("/maquinas", {
                method: "POST",
                body: data
            }),

        updateMachine: (id, data) =>
            request(`/maquinas/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: data
            }),

        // Solicitações
        getRequests: () =>
            request("/solicitacoes"),

        createRequest: (data) =>
            request("/solicitacoes", {
                method: "POST",
                body: data
            }),

        // Alocações
        getBookings: () =>
            request("/alocacoes"),

        createBooking: (data) =>
            request("/alocacoes", {
                method: "POST",
                body: data
            })
    };

})();
