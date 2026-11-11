
const BASE_URL = "http://localhost:3000/api";

async function buscarMaquinas() {
  const resposta = await fetch(`${BASE_URL}/maquinas`, {
    credentials: "include"
  });

  if (!resposta.ok) {
    throw new Error("Erro ao carregar as máquinas");
  }

  return await resposta.json();
}
