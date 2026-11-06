import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL, SENHA } from "../helpers/config";
import { obterLinkEmail } from "../emails";

const MENSAGEM_LINK_RECUSADO = /Este link não vale mais/;
const MENSAGEM_ATIVADA = "Conta ativada! Entre com o seu e-mail e a senha que você criou.";

function novoEmail(prefixo: string) {
  return `${prefixo}-${randomUUID()}@example.com`;
}

async function abrirLinkDoConvite({ page, link }: { page: Page; link: string }) {
  await page.goto(link);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Ative sua conta" })).toBeVisible();
}

async function preencherSenhaEAceitarTermos(page: Page) {
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(SENHA);
  await page.getByRole("checkbox", { name: /Termos de Uso/ }).check();
}

function respostaDoConvite(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/auth/invitation/confirm` &&
      response.request().method() === "POST",
  );
}

async function esperarLoginRecusado({ page, email }: { page: Page; email: string }) {
  await page.goto("/login");
  await entrar({ page, email, senha: SENHA });
  await expect(
    page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." }),
  ).toBeVisible();
  await expect(page).toHaveURL("/login");
}

async function comContextoDoConvidado(browser: Browser, executar: (page: Page) => Promise<void>) {
  const contexto = await browser.newContext();
  try {
    await executar(await contexto.newPage());
  } finally {
    await contexto.close();
  }
}

test.describe("convite e ativação de conta", () => {
  test("admin convida profissional, reenvia o convite e só o link novo ativa a conta", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);
    const nome = "Profissional Convite E2e";
    const email = novoEmail("convite-profissional");
    const cardDoUsuario = page.getByRole("link").filter({ hasText: email });
    const convidado = await browser.newContext();
    const paginaDoConvidado = await convidado.newPage();
    try {
      await test.step("Admin cria profissional por convite e vê o selo de convite pendente", async () => {
        await page.goto("/login");
        await entrar({ page, email: "admin@hality.com" });
        await expect(page).toHaveURL("/admin");
        await page.goto("/admin/usuarios");
        await page.getByRole("button", { name: "Criar", exact: true }).click();
        const dialogo = page.getByRole("dialog", { name: "Criar usuário" });
        await dialogo.getByLabel("Nome completo").fill(nome);
        await dialogo.getByLabel("E-mail").fill(email);
        await dialogo.getByRole("radio", { name: "Profissional" }).check();
        await dialogo.getByLabel("Registro profissional").fill("CRO-E2E-1");
        await dialogo.getByLabel("Especialidade").fill("Halitose");
        const criacao = page.waitForResponse(
          (response) =>
            response.url() === `${API_URL}/admin/usuarios` &&
            response.request().method() === "POST",
        );
        await dialogo.getByRole("button", { name: "Criar e convidar" }).click();
        expect((await criacao).status()).toBe(201);
        await expect(page.getByText("Usuário criado. Convite pendente de ativação.")).toBeVisible();
        await page.getByLabel("Buscar usuário").fill(email);
        await expect(cardDoUsuario).toHaveCount(1);
        await expect(cardDoUsuario.getByText("Convite pendente")).toBeVisible();
        await cardDoUsuario.click();
        await expect(page.getByRole("heading", { name: "Convite pendente" })).toBeVisible();
      });

      await test.step("Login antes da ativação é recusado", async () => {
        await esperarLoginRecusado({ page: paginaDoConvidado, email });
      });

      let linkAntigo = "";
      let linkNovo = "";
      await test.step("Reenviar convite gera um link novo", async () => {
        linkAntigo = await obterLinkEmail({ destinatario: email, finalidade: "invitation" });
        const reenvio = page.waitForResponse(
          (response) =>
            response.url().endsWith("/reenviar-convite") && response.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Reenviar convite" }).click();
        expect((await reenvio).status()).toBe(200);
        await expect(page.getByText("Um novo convite foi solicitado.")).toBeVisible();
        await expect
          .poll(() => obterLinkEmail({ destinatario: email, finalidade: "invitation" }), {
            timeout: 30_000,
          })
          .not.toBe(linkAntigo);
        linkNovo = await obterLinkEmail({ destinatario: email, finalidade: "invitation" });
      });

      await test.step("Link antigo é recusado e o token sai da barra de endereço", async () => {
        await abrirLinkDoConvite({ page: paginaDoConvidado, link: linkAntigo });
        await preencherSenhaEAceitarTermos(paginaDoConvidado);
        const confirmacao = respostaDoConvite(paginaDoConvidado);
        await paginaDoConvidado.getByRole("button", { name: "Ativar conta" }).click();
        expect((await confirmacao).status()).toBe(400);
        await expect(
          paginaDoConvidado.getByRole("alert").filter({ hasText: MENSAGEM_LINK_RECUSADO }),
        ).toBeVisible();
        await expect(
          paginaDoConvidado.getByRole("button", { name: "Ativar conta" }),
        ).toBeDisabled();
      });

      await test.step("Link novo define a senha, aceita os termos e ativa a conta", async () => {
        await abrirLinkDoConvite({ page: paginaDoConvidado, link: linkNovo });
        await preencherSenhaEAceitarTermos(paginaDoConvidado);
        const confirmacao = respostaDoConvite(paginaDoConvidado);
        await paginaDoConvidado.getByRole("button", { name: "Ativar conta" }).click();
        expect((await confirmacao).status()).toBe(204);
        await expect(paginaDoConvidado.getByText(MENSAGEM_ATIVADA)).toBeVisible();
      });

      await test.step("Login com a senha nova cai na home do profissional", async () => {
        await paginaDoConvidado.getByRole("link", { name: "Ir para o login" }).click();
        await entrar({ page: paginaDoConvidado, email, senha: SENHA });
        await expect(paginaDoConvidado).toHaveURL("/profissional");
        await expect(paginaDoConvidado.getByRole("heading", { name: nome })).toBeVisible();
      });

      await test.step("Admin deixa de ver o convite pendente", async () => {
        await page.reload();
        await expect(page.getByRole("button", { name: "Redefinir senha" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Convite pendente" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Reenviar convite" })).toHaveCount(0);
      });
    } finally {
      await convidado.close();
    }
  });

  test("profissional cadastra paciente, que ativa a conta aceitando dados de saúde e recusando treino de IA", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const emailProfissional = novoEmail("convite-profissional");
    const nomePaciente = "Paciente Convite E2e";
    const emailPaciente = novoEmail("convite-paciente");
    const cardDoPaciente = page.getByRole("link").filter({ hasText: emailPaciente });

    await test.step("Admin prepara um profissional ativo para cadastrar o paciente", async () => {
      const headers = await tokenDe({ request, email: "admin@hality.com" });
      const criacao = await request.post(`${API_URL}/admin/usuarios`, {
        headers,
        data: {
          nome: "Profissional Cadastro E2e",
          email: emailProfissional,
          role: "profissional",
          senha: SENHA,
          enviar_convite: false,
          profissional: { registro_profissional: "CRO-E2E-2", especialidade: "Halitose" },
        },
      });
      expect(criacao.status()).toBe(201);
    });

    await test.step("Profissional cadastra paciente e vê o selo de primeiro acesso pendente", async () => {
      await page.goto("/login");
      await entrar({ page, email: emailProfissional });
      await expect(page).toHaveURL("/profissional");
      await page.goto("/profissional/avaliacao");
      await page.getByRole("button", { name: "Cadastrar novo paciente" }).click();
      await page.getByLabel("Nome completo *").fill(nomePaciente);
      await page.getByLabel("E-mail *").fill(emailPaciente);
      await page.getByLabel("Data de nascimento *").fill("1990-01-01");
      const criacao = page.waitForResponse(
        (response) =>
          response.url() === `${API_URL}/pacientes` && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Cadastrar e continuar" }).click();
      const resposta = await criacao;
      expect(resposta.status()).toBe(201);
      expect(await resposta.json()).toMatchObject({ convite_pendente: true });
      await expect(page.getByRole("heading", { name: "Anamnese" })).toBeVisible();
      await page.goto("/profissional/pacientes");
      await expect(cardDoPaciente).toHaveCount(1);
      await expect(cardDoPaciente.getByText("Aguardando primeiro acesso")).toBeVisible();
    });

    await comContextoDoConvidado(browser, async (paginaDoPaciente) => {
      await test.step("Login antes da ativação é recusado", async () => {
        await esperarLoginRecusado({ page: paginaDoPaciente, email: emailPaciente });
      });

      await test.step("Paciente abre o link e o token sai da barra de endereço", async () => {
        const link = await obterLinkEmail({
          destinatario: emailPaciente,
          finalidade: "invitation",
        });
        await abrirLinkDoConvite({ page: paginaDoPaciente, link });
      });

      await test.step("Ativação pede os consentimentos antes de concluir", async () => {
        await preencherSenhaEAceitarTermos(paginaDoPaciente);
        const confirmacao = respostaDoConvite(paginaDoPaciente);
        await paginaDoPaciente.getByRole("button", { name: "Ativar conta" }).click();
        expect((await confirmacao).status()).toBe(422);
        await expect(
          paginaDoPaciente.getByText(
            "Para ativar sua conta, autorize o uso dos seus dados abaixo.",
          ),
        ).toBeVisible();
        await expect(
          paginaDoPaciente.getByRole("checkbox", { name: /dados de saúde/ }),
        ).not.toBeChecked();
        await expect(
          paginaDoPaciente.getByRole("checkbox", { name: /treinar a inteligência/ }),
        ).not.toBeChecked();
      });

      await test.step("Paciente aceita dados de saúde, recusa treino de IA e ativa a conta", async () => {
        await paginaDoPaciente.getByRole("checkbox", { name: /dados de saúde/ }).check();
        await expect(
          paginaDoPaciente.getByRole("checkbox", { name: /treinar a inteligência/ }),
        ).not.toBeChecked();
        const confirmacao = respostaDoConvite(paginaDoPaciente);
        await paginaDoPaciente.getByRole("button", { name: "Ativar conta" }).click();
        expect((await confirmacao).status()).toBe(204);
        await expect(paginaDoPaciente.getByText(MENSAGEM_ATIVADA)).toBeVisible();
      });

      await test.step("Login com a senha nova cai na home do paciente com as decisões gravadas", async () => {
        await paginaDoPaciente.getByRole("link", { name: "Ir para o login" }).click();
        await entrar({ page: paginaDoPaciente, email: emailPaciente, senha: SENHA });
        await expect(paginaDoPaciente).toHaveURL("/paciente");
        await expect(
          paginaDoPaciente.getByRole("heading", { name: "Paciente Convite" }),
        ).toBeVisible();
        const token = await paginaDoPaciente.evaluate(
          (chave) => localStorage.getItem(chave),
          TOKEN_STORAGE_KEY,
        );
        expect(token).toBeTruthy();
        const consentimentos = await paginaDoPaciente.request.get(
          `${API_URL}/users/me/consentimentos`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(consentimentos.status()).toBe(200);
        expect((await consentimentos.json()).consentimentos).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ finalidade: "health_data", aceito: true, vigente: true }),
            expect.objectContaining({ finalidade: "image_training", aceito: false }),
          ]),
        );
      });
    });

    await test.step("Profissional deixa de ver o aguardo do primeiro acesso", async () => {
      await page.reload();
      await expect(cardDoPaciente).toHaveCount(1);
      await expect(page.getByText("Aguardando primeiro acesso")).toHaveCount(0);
      await cardDoPaciente.click();
      await expect(page.getByRole("heading", { name: "Dados" })).toBeVisible();
      await expect(page.getByText("Aguardando primeiro acesso")).toHaveCount(0);
    });
  });
});
