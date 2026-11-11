
(function () {
    "use strict";

    // Chave usada para salvar os dados de demonstração.
    const STORAGE_KEY = "alloclink_app_profile_sem_dados_v1";

    // Importa as funções que core.js disponibiliza.
    const A = window.Alloc;

    // 1. Busca os dados do perfil.
    function carregarPerfil() {
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
                    Os dados serão salvos localmente
                    nesta etapa demonstrativa.
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

        formulario.addEventListener("submit", function (event) {

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
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(perfil)
                );

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
        atualizarMenu
    };

})();
