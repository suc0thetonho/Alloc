
(function () {
    "use strict";

    // Chave usada para salvar os dados de demonstração.
    const STORAGE_KEY = "alloclink_app_profile_sem_dados_v1";

    // Importa as funções que core.js disponibiliza.
    const A = window.Alloc;
    const isApiMode = () => window.AllocConfig?.mode === "api";

    let remoteProfile = {
        nome: "",
        email: "",
        telefone: ""
    };

    // 1. Busca os dados do perfil.
    function carregarPerfil() {

        if (isApiMode()) {
            return { ...remoteProfile };
        }

        const perfilPadrao = {
            nome: "",
            email: "",
            telefone: ""
        };


        try {
            const salvo = localStorage.getItem(STORAGE_KEY);

            if (!salvo) {
                return perfilPadrao;
            }

            return {
                ...perfilPadrao,
                ...JSON.parse(salvo)
            };

        } catch (erro) {
            console.error("Erro ao carregar perfil:", erro);
            return perfilPadrao;
        }
    }

    async function carregarDaApi() {
        if (!isApiMode()) {
            return carregarPerfil();
        }

        const resposta = await window.AllocApi.getProfile();

        if (!resposta || typeof resposta !== "object") {
            throw new Error("Perfil inválido recebido do servidor.");
        }

        remoteProfile = {
            nome: String(resposta.nome || ""),
            email: String(resposta.email || ""),
            telefone: String(resposta.telefone || "")
        };

        atualizarMenu();

        return { ...remoteProfile };
    }

    // 2. Atualiza o nome exibido no menu.
    function atualizarMenu() {
        const perfil = carregarPerfil();

        const nomeMenu = document.querySelector(
            ".sidebar-profile b"
        );

        const avatar = document.querySelector(
            ".profile-avatar"
        );

        if (nomeMenu) {
            nomeMenu.textContent = perfil.nome;
        }

        if (avatar) {
            const iniciais = perfil.nome
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(parte => parte[0])
                .join("")
                .toUpperCase();

            avatar.textContent = iniciais || "-";
        }
    }

    // 3. Monta o HTML da tela.
    function render() {
        const perfil = carregarPerfil();

        // Evita inserir HTML vindo dos campos de usuário.
        const safe = A.safe;

        return `
            <div class="admin-head">
                <div>
                    <div class="eyebrow eyebrow-soft">
                        CONFIGURAÇÕES DA CONTA
                    </div>

                    <h1>Meu perfil</h1>

                    <p>
                        Gerencie suas informações
                        pessoais e de contato.
                    </p>
                </div>
            </div>

            <section class="panel profile-settings-panel">

                <h2>Informações pessoais</h2>

                <p class="profile-settings-note">
                    ${isApiMode()
                        ? "Informações do usuário autenticado."
                        : "Os dados serão salvos localmente nesta demonstração."}
                </p>
                <form id="profileForm" class="form-grid">

                    <label class="field field-full">
                        Nome completo

                        <input
                            type="text"
                            name="nome"
                            value="${safe(perfil.nome)}"
                            maxlength="120"
                            autocomplete="name"
                            required
                        >
                    </label>

                    <label class="field field-full">
                        E-mail

                        <input
                            type="email"
                            name="email"
                            value="${safe(perfil.email)}"
                            maxlength="180"
                            autocomplete="email"
                            required
                        >
                    </label>

                    <label class="field field-full">
                        Telefone

                        <input
                            type="tel"
                            name="telefone"
                            value="${safe(perfil.telefone)}"
                            maxlength="25"
                            autocomplete="tel"
                            placeholder="(87) 99999-9999"
                        >
                    </label>

                    <div class="field-full form-foot">

                        <button
                            type="submit"
                            class="btn btn-primary"
                        >
                            Salvar alterações
                        </button>

                    </div>

                </form>

            </section>
        `;
    }

    // 4. Adiciona o funcionamento do formulário.
    function wire() {
        const formulario = document.getElementById(
            "profileForm"
        );

        if (!formulario) return;

        const botao = formulario.querySelector(
            'button[type="submit"]'
        );

        if (isApiMode()) {
            botao.disabled = true;

            carregarDaApi()
                .then(perfil => {
                    if (!formulario.isConnected) return;

                    for (const campo of ["nome", "email", "telefone"]) {
                        formulario.elements.namedItem(campo).value =
                            perfil[campo];
                    }

                    botao.disabled = false;
                })
                .catch(erro => {
                    A.toast(erro.message, "error");
                });
        }

        formulario.addEventListener("submit", async function (event) {

            // Impede o recarregamento da página.
            event.preventDefault();

            // Captura os dados preenchidos.
            const campos = new FormData(formulario);

            const perfil = {
                nome: String(campos.get("nome") || "").trim(),
                email: String(campos.get("email") || "")
                    .trim()
                    .toLowerCase(),
                telefone: String(campos.get("telefone") || "")
                    .trim()
            };

            // Validação básica.
            if (!perfil.nome || !formulario.reportValidity()) {
                A.toast("Confira os campos informados.", "error");
                return;
            }

            try {
                // Salva no navegador, por enquanto.
                if (isApiMode()) {
                    await window.AllocApi.updateProfile(perfil);
                    await carregarDaApi();
                } else {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(perfil)
                    );
                }

                // Atualiza o menu lateral.
                atualizarMenu();

                A.toast("Perfil salvo na demonstração!");

            } catch (erro) {
                console.error("Erro ao salvar perfil:", erro);
                A.toast("Não foi possível salvar.", "error");
            }
        });
    }

    // 5. Disponibiliza as funções para admin.js.
    window.AllocProfile = {
        render,
        wire,
        atualizarMenu,
        carregarDaApi
    };

})();
