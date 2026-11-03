import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const api = `http://localhost:${process.env.E2E_API_PORT || "8000"}/api/v1`;
const senha = "HalityE2e123!";

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Login", exact: true }).click();
}

async function criarDiagnostico(request: APIRequestContext) {
  const login = await request.post(`${api}/auth/login`, {
    form: { username: "carla.mendes@example.com", password: senha },
  });
  expect(login.ok()).toBeTruthy();
  const { access_token: token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const questionario = await request.get(`${api}/anamneses/questionario`, { headers });
  expect(questionario.ok()).toBeTruthy();
  const catalogo = await questionario.json();
  const respostas = catalogo.perguntas.map(
    (pergunta: { id: string; tipo: string; opcoes: string[]; escala_min: number }) => ({
      pergunta_id: pergunta.id,
      valor_bruto:
        pergunta.tipo === "boolean"
          ? false
          : pergunta.tipo === "single_choice"
            ? pergunta.opcoes[0]
            : pergunta.tipo === "scale"
              ? pergunta.escala_min
              : "Teste",
    }),
  );
  const anamnese = await request.post(`${api}/anamneses`, {
    headers,
    data: { versao_questionario: catalogo.versao, respostas },
  });
  expect(anamnese.ok(), await anamnese.text()).toBeTruthy();
  const { id } = await anamnese.json();
  const imagem = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aXcAAAAASUVORK5CYII=",
    "base64",
  );
  const diagnostico = await request.post(`${api}/diagnosticos`, {
    headers,
    multipart: {
      anamnese_id: String(id),
      parametros_captura: "{}",
      imagem: { name: "lingua.png", mimeType: "image/png", buffer: imagem },
    },
  });
  expect(diagnostico.status(), await diagnostico.text()).toBe(202);
  const criado = await diagnostico.json();
  await expect
    .poll(
      async () => {
        const resposta = await request.get(`${api}/diagnosticos/${criado.id}`, { headers });
        return (await resposta.json()).status;
      },
      { timeout: 15_000 },
    )
    .toBe("aguardando_revisao");
  return criado.id;
}

test("revisão profissional corrigida chega ao paciente sem perder o resultado da IA", async ({
  page,
  browser,
  request,
}) => {
  const id = await criarDiagnostico(request);
  await entrar(page, "ana.souza@hality.com");
  await expect(page).toHaveURL("/profissional");
  await page.goto(`/profissional/diagnosticos/${id}`);
  await expect(page.getByText("Sua avaliação")).toBeVisible();
  const leituraIA = page.getByText("Resultado da IA", { exact: true });
  await expect(leituraIA).toBeVisible();
  const botoes = page.getByRole("button", { name: /^[123] — / });
  const original = await leituraIA
    .locator("../../..")
    .locator("span.rounded-4xl")
    .first()
    .textContent();
  const nomes = ["Hálito Normal", "Halitose Íntima", "Mau Hálito Social"];
  const indice = nomes.findIndex((nome) => original?.includes(nome));
  expect(indice).toBeGreaterThanOrEqual(0);
  const corrigido = (indice + 1) % nomes.length;
  const nomeCorrigido = nomes[corrigido];
  if (!nomeCorrigido) throw new Error("Classificação corrigida inválida");
  await botoes.nth(corrigido).click();
  await page
    .getByLabel("Observações clínicas")
    .fill("Observação clínica sintética para acompanhamento.");
  await page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Revisão salva" })).toBeVisible();
  await expect(page.getByTitle("Classificação original da IA, antes da revisão")).toContainText(
    `IA: ${nomes[indice]}`,
  );
  const contextoPaciente = await browser.newContext();
  try {
    const paciente = await contextoPaciente.newPage();
    await entrar(paciente, "carla.mendes@example.com");
    await expect(paciente).toHaveURL("/paciente");
    await paciente.goto(`/paciente/diagnosticos/${id}`);
    await expect(paciente.getByText("Resultado do profissional")).toBeVisible();
    await expect(
      paciente.getByText("Observação clínica sintética para acompanhamento."),
    ).toBeVisible();
    await expect(paciente.getByText("Ajustado na revisão")).toBeVisible();
    await expect(paciente.getByText(/Revisado por Dra\. Ana Souza/)).toBeVisible();
    await expect(paciente.getByText(nomeCorrigido, { exact: true }).first()).toBeVisible();
  } finally {
    await contextoPaciente.close();
  }
});
