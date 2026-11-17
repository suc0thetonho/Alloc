(function () {
    "use strict";

    const BASE_URL = window.AllocConfig.apiBaseUrl;

    // Função reutilizável para requisições HTTP.
    async function request(path, options = {}) {

        const method = options.method || "GET";

        const hasBody = options.body !== undefined;

        let response;

        try {
            response = await fetch(`${BASE_URL}${path}`, {
                method,

                headers: hasBody
                    ? { "Content-Type": "application/json" }
                    : {},

                // Exemplo para autenticação por cookies.
                credentials: "include",

                body: hasBody
                    ? JSON.stringify(options.body)
                    : undefined
            });

        } catch (error) {
            throw new Error(
                "Não foi possível conectar ao servidor."
            );
        }

        if (!response.ok) {
            throw new Error(
                `Erro na requisição: ${response.status}`
            );
        }

        if (response.status === 204) {
            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return await response.json();
        }

        return null;
    }

    // Funções que o Frontend utilizará na integração.
    window.AllocApi = {

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
