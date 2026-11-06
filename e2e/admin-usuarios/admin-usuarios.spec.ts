import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { obterLinkEmail } from "../emails";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const EMAIL_ADMIN_DO_SEED = "admin@hality.com";

const usuarioAtualSchema = z.object({ id: z.string() });
const listaAdminSchema = z.object({
  total: z.number(),
  itens: z.array(z.object({ id: z.string() })),
});
const erroSchema = z.object({ detail: z.string() });

function novoEmail(prefixo: string) {
  return `${prefixo}-${randomUUID()}@example.com`;
}

async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await entrar({ page, email: EMAIL_ADMIN_DO_SEED });
  await expect(page).toHaveURL("/admin");
}

async function abrirUsuario(page: Page, email: string) {
  await page.goto("/admin/usuarios");
  await page.getByLabel("Buscar usuário").fill(email);
  await page.getByRole("link", { name: new RegExp(email) }).click();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
}

async function criarUsuarioPeloDialogo(
  page: Page,
  usuario: { nome: string; email: string; tipo: "Paciente" | "Profissional" },
) {
  await page.goto("/admin/usuarios");
  await page.getByRole("button", { name: "Criar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Criar usuário" });
  await dialogo.getByLabel("Nome completo").fill(usuario.nome);
  await dialogo.getByLabel("E-mail", { exact: true }).fill(usuario.email);
  await dialogo.getByRole("radio", { name: usuario.tipo }).check();
  if (usuario.tipo === "Profissional") {
    await dialogo.getByLabel("Registro profissional").fill("CRO-E2E-16");
    await dialogo.getByLabel("Especialidade").fill("Odontologia E2E");
  }
  await dialogo.getByRole("button", { name: "Criar e convidar" }).click();
}

function linhaDoDetalhe(page: Page, rotulo: string) {
  return page.getByText(rotulo, { exact: true }).first().locator("xpath=..");
}

test("admin bloqueia e desbloqueia um usuário e o login acompanha o estado", async ({
  page,
  browser,
  request,
}) => {
  const contextoPaciente = await browser.newContext();
  try {
    const paginaPaciente = await contextoPaciente.newPage();
    const { email } = await criarPacienteConfirmado({
      request,
      page: paginaPaciente,
      nome: "Paciente Bloqueio E2E",
      email: novoEmail("admin-usuarios-bloqueio"),
    });

    await test.step("Admin bloqueia o paciente pela tela de detalhe", async () => {
      await entrarComoAdmin(page);
      await abrirUsuario(page, email);
      await page.getByRole("button", { name: "Bloquear usuário" }).click();
      const confirmacao = page.getByRole("alertdialog", { name: "Bloquear usuário" });
      await expect(confirmacao).toContainText("Paciente Bloqueio E2E");
      await confirmacao.getByRole("button", { name: "Bloquear", exact: true }).click();
      await expect(page.getByText("Bloqueado", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Desbloquear usuário" })).toBeVisible();
      const redefinirSenha = page.getByRole("button", { name: /Redefinir senha/ });
      await expect(redefinirSenha).toBeDisabled();
      await expect(redefinirSenha).toContainText("Desbloqueie o usuário para enviar o link");
    });

    await test.step("Bloqueio persiste após recarregar e aparece na lista", async () => {
      await page.reload();
      await expect(page.getByText("Bloqueado", { exact: true })).toBeVisible();
      await page.goto("/admin/usuarios");
      await page.getByLabel("Buscar usuário").fill(email);
      await expect(
        page.getByRole("link", { name: new RegExp(email) }).getByText("Bloqueado"),
      ).toBeVisible();
    });

    await test.step("Login do paciente bloqueado é recusado", async () => {
      await paginaPaciente.goto("/login");
      await entrar({ page: paginaPaciente, email });
      await expect(
        paginaPaciente.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." }),
      ).toBeVisible();
      await expect(paginaPaciente).toHaveURL("/login");
    });

    await test.step("Admin desbloqueia o paciente", async () => {
      await abrirUsuario(page, email);
      await page.getByRole("button", { name: "Desbloquear usuário" }).click();
      const confirmacao = page.getByRole("alertdialog", { name: "Desbloquear usuário" });
      await confirmacao.getByRole("button", { name: "Desbloquear", exact: true }).click();
      await expect(page.getByRole("button", { name: "Bloquear usuário" })).toBeVisible();
      await expect(page.getByText("Bloqueado", { exact: true })).toBeHidden();
    });

    await test.step("Paciente desbloqueado volta a entrar", async () => {
      await paginaPaciente.goto("/login");
      await entrar({ page: paginaPaciente, email });
      await expect(paginaPaciente).toHaveURL("/paciente");
    });
  } finally {
    await contextoPaciente.close();
  }
});

test("admin edita a afiliação Hality de um profissional", async ({ page }) => {
  const email = novoEmail("admin-usuarios-profissional");
  await entrarComoAdmin(page);

  await test.step("Admin cria um profissional pelo diálogo", async () => {
    await criarUsuarioPeloDialogo(page, {
      nome: "Profissional Afiliação E2E",
      email,
      tipo: "Profissional",
    });
    await expect(
      page.getByRole("status").filter({ hasText: "Usuário criado. Convite pendente de ativação." }),
    ).toBeVisible();
  });

  await test.step("Detalhe mostra o profissional sem vínculo com a Hality", async () => {
    await abrirUsuario(page, email);
    await expect(page.getByText("Convite pendente", { exact: true }).first()).toBeVisible();
    await expect(linhaDoDetalhe(page, "Registro")).toContainText("CRO-E2E-16");
    await expect(linhaDoDetalhe(page, "Especialidade")).toContainText("Odontologia E2E");
    await expect(linhaDoDetalhe(page, "Vinculado à Hality")).toContainText("Não");
  });

  await test.step("Admin marca o profissional como vinculado à Hality", async () => {
    await page.getByRole("button", { name: /Dados profissionais/ }).click();
    const vinculo = page.getByRole("switch", { name: "Vinculado à Hality" });
    await expect(vinculo).toHaveAttribute("aria-checked", "false");
    await vinculo.click();
    await expect(vinculo).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("switch", { name: "Vinculado à Hality" })).toBeHidden();
    await expect(linhaDoDetalhe(page, "Vinculado à Hality")).toContainText("Sim");
  });

  await test.step("Afiliação persiste após recarregar", async () => {
    await page.reload();
    await expect(linhaDoDetalhe(page, "Vinculado à Hality")).toContainText("Sim");
    await expect(linhaDoDetalhe(page, "Registro")).toContainText("CRO-E2E-16");
    await expect(linhaDoDetalhe(page, "Especialidade")).toContainText("Odontologia E2E");
  });
});

test("bloquear o último admin ativo é recusado", async ({ page, request }) => {
  const headers = await tokenDe({ request, email: EMAIL_ADMIN_DO_SEED });

  const idDoAdmin = await test.step("Só existe um admin ativo, e é a sessão atual", async () => {
    const atual = usuarioAtualSchema.parse(
      await (await request.get(`${API_URL}/users/me`, { headers })).json(),
    );
    const admins = listaAdminSchema.parse(
      await (
        await request.get(`${API_URL}/admin/usuarios?role=admin&ativo=true`, { headers })
      ).json(),
    );
    expect(admins.total).toBe(1);
    expect(admins.itens.map((admin) => admin.id)).toEqual([atual.id]);
    return atual.id;
  });

  await test.step("Próprio admin não tem a opção de se bloquear", async () => {
    await entrarComoAdmin(page);
    await page.goto(`/admin/usuarios/${idDoAdmin}`);
    await expect(page.getByText(EMAIL_ADMIN_DO_SEED, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar dados/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bloquear usuário" })).toHaveCount(0);
  });

  await test.step("API recusa bloquear o último admin ativo", async () => {
    const resposta = await request.patch(`${API_URL}/admin/usuarios/${idDoAdmin}`, {
      headers,
      data: { ativo: false },
    });
    expect(resposta.status()).toBe(409);
    expect(erroSchema.parse(await resposta.json()).detail).toBe(
      "é necessário manter ao menos um administrador ativo",
    );
  });

  await test.step("Admin continua ativo e entrando", async () => {
    await page.reload();
    await expect(page.getByText("Bloqueado", { exact: true })).toBeHidden();
    await tokenDe({ request, email: EMAIL_ADMIN_DO_SEED });
  });
});

test("redefinir senha envia o link por e-mail ao usuário", async ({ page, browser, request }) => {
  const contextoPaciente = await browser.newContext();
  try {
    const paginaPaciente = await contextoPaciente.newPage();
    const { email } = await criarPacienteConfirmado({
      request,
      page: paginaPaciente,
      nome: "Paciente Redefinição E2E",
      email: novoEmail("admin-usuarios-senha"),
    });

    await test.step("Admin envia o link de redefinição", async () => {
      await entrarComoAdmin(page);
      await abrirUsuario(page, email);
      await page.getByRole("button", { name: /Redefinir senha/ }).click();
      const confirmacao = page.getByRole("alertdialog", { name: "Redefinir senha" });
      await expect(confirmacao).toContainText(email);
      await confirmacao.getByRole("button", { name: "Enviar link" }).click();
      await expect(confirmacao).toContainText(`O link foi solicitado e chega em ${email}`);
      await confirmacao.getByRole("button", { name: "Fechar" }).click();
      await expect(confirmacao).toBeHidden();
    });

    await test.step("E-mail de redefinição é capturado e abre a tela de nova senha", async () => {
      const link = await obterLinkEmail({ destinatario: email, finalidade: "password_reset" });
      await paginaPaciente.goto(link);
      await expect(paginaPaciente.getByRole("heading", { name: "Nova senha" })).toBeVisible();
    });
  } finally {
    await contextoPaciente.close();
  }
});

test("criar usuário com e-mail já cadastrado mostra erro", async ({ page }) => {
  const email = novoEmail("admin-usuarios-duplicado");
  await entrarComoAdmin(page);

  await test.step("Admin cria um paciente pelo diálogo", async () => {
    await criarUsuarioPeloDialogo(page, {
      nome: "Paciente Duplicado E2E",
      email,
      tipo: "Paciente",
    });
    await expect(
      page.getByRole("status").filter({ hasText: "Usuário criado. Convite pendente de ativação." }),
    ).toBeVisible();
  });

  await test.step("Segundo cadastro com o mesmo e-mail é recusado", async () => {
    await page.getByRole("button", { name: "Criar" }).click();
    const dialogo = page.getByRole("dialog", { name: "Criar usuário" });
    await dialogo.getByLabel("Nome completo").fill("Paciente Duplicado E2E");
    await dialogo.getByLabel("E-mail", { exact: true }).fill(email);
    await dialogo.getByRole("button", { name: "Criar e convidar" }).click();
    await expect(
      dialogo.getByRole("alert").filter({ hasText: "Esse e-mail já está cadastrado." }),
    ).toBeVisible();
  });

  await test.step("Nenhum usuário duplicado é criado", async () => {
    await page.keyboard.press("Escape");
    await page.getByLabel("Buscar usuário").fill(email);
    await expect(page.getByText("1 usuário", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(email) })).toHaveCount(1);
  });
});
