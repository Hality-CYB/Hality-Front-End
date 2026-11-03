import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";

const API_URL = `http://localhost:${process.env.E2E_API_PORT || "8000"}/api/v1`;
const SENHA = "HalityE2e123!";
const NOME = "Pessoa Cadastro E2e";

function novoEmail() {
  return `cadastro-${randomUUID()}@example.com`;
}

async function preencherCadastro(page: Page, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nome completo *").fill(NOME);
  await page.getByLabel("E-mail *").fill(email);
  await page.getByLabel("Data de nascimento *").fill("1990-05-20");
  await page.getByLabel("Telefone", { exact: true }).fill("11987654321");
  await page.getByLabel("Senha *", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha *", { exact: true }).fill(SENHA);
  await page.getByRole("checkbox", { name: /Termos de Uso/ }).check();
  await expect(page.getByRole("checkbox", { name: /dados de saúde/ })).toBeVisible();
}

async function cadastrar(page: Page, email: string) {
  await preencherCadastro(page, email);
  await page.getByRole("checkbox", { name: /dados de saúde/ }).check();
  await expect(page.getByRole("checkbox", { name: /treinar a inteligência/ })).not.toBeChecked();
  const resposta = page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/auth/register` && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Criar conta" }).click();
  return resposta;
}

test("cadastro aceita dados de saúde, recusa treino de IA e inicia sessão de paciente", async ({
  page,
  context,
}) => {
  const email = novoEmail();
  expect((await cadastrar(page, email)).status()).toBe(201);
  await expect(page).toHaveURL("/paciente");
  await expect(page.getByRole("heading", { name: "Pessoa Cadastro" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(email) })).toBeVisible();
  expect(
    (await context.cookies(`${API_URL}/auth/refresh`)).find((c) => c.name === "refresh_token"),
  ).toMatchObject({ httpOnly: true });
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY);
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const perfil = await page.request.get(`${API_URL}/users/me`, { headers });
  expect(perfil.status()).toBe(200);
  expect(await perfil.json()).toMatchObject({ name: NOME, email });
  const consentimentos = await page.request.get(`${API_URL}/users/me/consentimentos`, { headers });
  expect(consentimentos.status()).toBe(200);
  expect((await consentimentos.json()).consentimentos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ finalidade: "health_data", aceito: true, vigente: true }),
      expect.objectContaining({ finalidade: "image_training", aceito: false }),
    ]),
  );
  await page.reload();
  await expect(page).toHaveURL("/paciente");
  await expect(page.getByRole("heading", { name: "Pessoa Cadastro" })).toBeVisible();
});

test("cadastro com e-mail duplicado é rejeitado", async ({ page, browser }) => {
  const email = novoEmail();
  expect((await cadastrar(page, email)).status()).toBe(201);
  const outraSessao = await browser.newContext();
  try {
    const outraPagina = await outraSessao.newPage();
    expect((await cadastrar(outraPagina, email)).status()).toBe(400);
    await expect(
      outraPagina.getByRole("alert").filter({ hasText: "Este e-mail já está cadastrado." }),
    ).toContainText("Este e-mail já está cadastrado.");
    await expect(outraPagina).toHaveURL("/registro");
  } finally {
    await outraSessao.close();
  }
});

test("cadastro sem consentimento obrigatório é rejeitado", async ({ page }) => {
  await preencherCadastro(page, novoEmail());
  let envios = 0;
  page.on("request", (request) => {
    if (request.url() === `${API_URL}/auth/register` && request.method() === "POST") envios++;
  });
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "aceite o tratamento" })).toContainText(
    "aceite o tratamento dos seus dados de saúde",
  );
  await expect(page).toHaveURL("/registro");
  expect(envios).toBe(0);
});
