import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { obterLinkEmail } from "../emails";
import { entrar } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const mensagemRecuperacao =
  "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.";
// Campos extras também podem revelar se uma conta existe; não os descarte na comparação.
const respostaRecuperacaoSchema = z.strictObject({ message: z.string() });
const senhaNova = "NovaSenha123!";
const senhaAlternativa = "OutraSenha456!";

async function solicitarRecuperacao(page: Page, email: string) {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  const resposta = page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/auth/password-recovery` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Enviar link" }).click();
  const resultado = await resposta;
  expect(resultado.status()).toBe(202);
  await expect(page.getByRole("status").filter({ hasText: mensagemRecuperacao })).toBeVisible();
  return respostaRecuperacaoSchema.parse(await resultado.json());
}

async function salvarSenha(page: Page, senha: string) {
  await page.getByLabel("Nova senha", { exact: true }).fill(senha);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill(senha);
  const resposta = page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/auth/password-recovery/confirm` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  return resposta;
}

test("recuperação mostra a mesma mensagem para e-mail cadastrado e desconhecido", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const email = `recuperacao-${randomUUID()}@example.com`;
  const emailDesconhecido = `recuperacao-ausente-${randomUUID()}@example.com`;

  await test.step("Paciente confirmado tem um e-mail próprio para recuperar o acesso", async () => {
    await criarPacienteConfirmado({ request, page, email });
  });

  const respostaConhecida =
    await test.step("E-mail cadastrado recebe uma confirmação genérica", async () => {
      await page.getByRole("link", { name: "Esqueceu sua senha?" }).click();
      await expect(page).toHaveURL("/esqueci-senha");
      await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
      return solicitarRecuperacao(page, email);
    });

  await test.step("E-mail desconhecido recebe a mesma confirmação sem expor a conta", async () => {
    await page.getByRole("button", { name: "Pedir de novo" }).click();
    const respostaDesconhecida = await solicitarRecuperacao(page, emailDesconhecido);
    expect(respostaDesconhecida).toEqual(respostaConhecida);
    await expect(page.getByRole("button", { name: "Pedir de novo" })).toBeVisible();
    await expect(page.getByText(emailDesconhecido)).not.toBeVisible();
  });
});

test("recuperação troca a senha, impede reuso do link e revoga a renovação da sessão anterior", async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const email = `recuperacao-${randomUUID()}@example.com`;
  const { senha: senhaAntiga } =
    await test.step("Paciente confirmado tem um e-mail próprio para recuperar o acesso", () =>
      criarPacienteConfirmado({ request, page, email }));
  const sessaoAnterior = await browser.newContext({
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "block",
  });

  try {
    await test.step("Sessão aberta antes da troca consegue renovar o acesso", async () => {
      const paginaAnterior = await sessaoAnterior.newPage();
      await paginaAnterior.goto("/login");
      await entrar({ page: paginaAnterior, email, senha: senhaAntiga });
      await expect(paginaAnterior).toHaveURL("/paciente");
      await expect(paginaAnterior.getByRole("link", { name: new RegExp(email) })).toBeVisible();
      expect(
        (await sessaoAnterior.cookies(`${API_URL}/auth/refresh`)).find(
          (cookie) => cookie.name === "refresh_token",
        ),
      ).toMatchObject({ httpOnly: true });
      expect((await sessaoAnterior.request.post(`${API_URL}/auth/refresh`)).status()).toBe(200);
      expect(
        (await sessaoAnterior.cookies(`${API_URL}/auth/refresh`)).find(
          (cookie) => cookie.name === "refresh_token",
        ),
      ).toMatchObject({ httpOnly: true });
    });

    const link =
      await test.step("Pedido de recuperação envia um link real para o próprio e-mail", async () => {
        await page.getByRole("link", { name: "Esqueceu sua senha?" }).click();
        await solicitarRecuperacao(page, email);
        return obterLinkEmail({ destinatario: email, finalidade: "password_reset" });
      });

    await test.step("Link do e-mail abre a nova senha sem deixar o token na URL", async () => {
      const urlSemToken = new URL(link);
      urlSemToken.searchParams.delete("token");
      urlSemToken.searchParams.delete("purpose");
      await page.goto(link);
      await expect(page.getByRole("heading", { name: "Nova senha" })).toBeVisible();
      await expect(page.getByLabel("Nova senha", { exact: true })).toBeEnabled();
      await expect(page.getByLabel("Confirmar nova senha", { exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Salvar nova senha" })).toBeEnabled();
      await expect(page).toHaveURL(urlSemToken.toString());
      expect(new URL(page.url()).searchParams.has("token")).toBe(false);
      expect(new URL(page.url()).searchParams.has("purpose")).toBe(false);
    });

    await test.step("Nova senha é salva pelo formulário e permite seguir para o login", async () => {
      expect((await salvarSenha(page, senhaNova)).status()).toBe(204);
      await expect(page.getByText("Senha alterada! Entre com a nova senha.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Ir para o login" })).toBeVisible();
      await expect(page.getByLabel("Nova senha", { exact: true })).not.toBeVisible();
    });

    await test.step("Sessão aberta antes da troca não consegue renovar o acesso", async () => {
      const resposta = await sessaoAnterior.request.post(`${API_URL}/auth/refresh`);
      expect(resposta.status()).toBe(401);
      expect(await resposta.json()).toEqual({ detail: "INVALID_REFRESH_TOKEN" });
      expect(
        (await sessaoAnterior.cookies(`${API_URL}/auth/refresh`)).some(
          (cookie) => cookie.name === "refresh_token",
        ),
      ).toBe(false);
    });

    await test.step("Link já utilizado é recusado e não permite salvar outra senha", async () => {
      await page.goto(link);
      await expect(page.getByLabel("Nova senha", { exact: true })).toBeEnabled();
      expect((await salvarSenha(page, senhaAlternativa)).status()).toBe(400);
      await expect(
        page.getByRole("alert").filter({ hasText: "Este link não vale mais." }),
      ).toContainText(
        "Este link não vale mais. Ele pode ter expirado, já ter sido usado ou ter sido substituído por um novo.",
      );
      await expect(page.getByRole("button", { name: "Salvar nova senha" })).toBeDisabled();
      await expect(page.getByRole("link", { name: "Pedir um novo link" })).toBeVisible();
    });

    await test.step("Senha antiga é recusada e a nova mantém o acesso após recarregar", async () => {
      await page.goto("/login");
      const loginAntigo = page.waitForResponse(
        (response) =>
          response.url() === `${API_URL}/auth/login` && response.request().method() === "POST",
      );
      await entrar({ page, email, senha: senhaAntiga });
      expect((await loginAntigo).status()).toBe(400);
      await expect(
        page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." }),
      ).toBeVisible();
      await expect(page).toHaveURL("/login");
      expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY)).toBeNull();
      const loginNovo = page.waitForResponse(
        (response) =>
          response.url() === `${API_URL}/auth/login` && response.request().method() === "POST",
      );
      await entrar({ page, email, senha: senhaNova });
      expect((await loginNovo).status()).toBe(200);
      await expect(page).toHaveURL("/paciente");
      await expect(page.getByRole("link", { name: new RegExp(email) })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL("/paciente");
      await expect(page.getByRole("link", { name: new RegExp(email) })).toBeVisible();
    });
  } finally {
    await sessaoAnterior.close();
  }
});
