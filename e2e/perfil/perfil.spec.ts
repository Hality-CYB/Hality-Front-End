import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL, SENHA } from "../helpers/config";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const SENHA_NOVA = "NovaSenhaE2e456!";
const EMAIL_ADMIN_SEED = "admin@hality.com";

type Papel = "paciente" | "profissional" | "admin";

const contaCriadaSchema = z.object({ id: z.string() });

const perfilSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  data_nascimento: z.string().nullable(),
  profissional: z
    .object({
      registro_profissional: z.string().nullable(),
      especialidade: z.string().nullable(),
      vinculado_hality: z.boolean(),
    })
    .nullable(),
});

function novoEmail(papel: Papel) {
  return `perfil-${papel}-${randomUUID()}@example.com`;
}

async function criarContaPeloAdmin({
  request,
  papel,
  nome,
  telefone,
  profissional,
}: {
  request: APIRequestContext;
  papel: "profissional" | "admin";
  nome: string;
  telefone: string;
  profissional?: { registro_profissional: string; especialidade: string; vinculado_hality: false };
}) {
  const headers = await tokenDe({ request, email: EMAIL_ADMIN_SEED });
  const email = novoEmail(papel);
  const resposta = await request.post(`${API_URL}/admin/usuarios`, {
    headers,
    data: {
      nome,
      email,
      telefone,
      role: papel,
      senha: SENHA,
      enviar_convite: false,
      ...(profissional ? { profissional } : {}),
    },
  });
  expect(resposta.status()).toBe(201);
  const { id } = contaCriadaSchema.parse(await resposta.json());
  return { id, email };
}

async function desativarContaPeloAdmin({
  request,
  id,
}: {
  request: APIRequestContext;
  id: string;
}) {
  const headers = await tokenDe({ request, email: EMAIL_ADMIN_SEED });
  const resposta = await request.patch(`${API_URL}/admin/usuarios/${id}`, {
    headers,
    data: { ativo: false },
  });
  expect(resposta.status()).toBe(200);
}

async function criarConta({
  request,
  page,
  papel,
}: {
  request: APIRequestContext;
  page: Page;
  papel: Papel;
}) {
  if (papel === "paciente") {
    const { email } = await criarPacienteConfirmado({
      request,
      page,
      nome: "Paciente Perfil Senha",
    });
    return { email, id: null };
  }
  return criarContaPeloAdmin({
    request,
    papel,
    nome: `${papel === "admin" ? "Admin" : "Profissional"} Perfil Senha`,
    telefone: "11900000000",
    ...(papel === "profissional"
      ? {
          profissional: {
            registro_profissional: "CRO-0001",
            especialidade: "Clínica geral",
            vinculado_hality: false,
          },
        }
      : {}),
  });
}

async function perfilDaApi({
  request,
  email,
  senha = SENHA,
}: {
  request: APIRequestContext;
  email: string;
  senha?: string;
}) {
  const headers = await tokenDe({ request, email, senha });
  const resposta = await request.get(`${API_URL}/users/me`, { headers });
  expect(resposta.status()).toBe(200);
  return perfilSchema.parse(await resposta.json());
}

async function atualizarPerfilPelaApi({
  request,
  email,
  corpo,
}: {
  request: APIRequestContext;
  email: string;
  corpo: object;
}) {
  const headers = await tokenDe({ request, email });
  return request.patch(`${API_URL}/users/me`, { headers, data: corpo });
}

async function salvarPeloDialog(page: Page, dialog: Locator) {
  const resposta = page.waitForResponse(
    (r) => r.url() === `${API_URL}/users/me` && r.request().method() === "PATCH",
  );
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  expect((await resposta).status()).toBe(200);
  await expect(dialog).toBeHidden();
}

function campoDeSenha(dialog: Locator, rotulo: string) {
  return dialog.locator(`label:text-is("${rotulo}") + input`);
}

function linkDaSidebar(page: Page, email: string) {
  return page.getByRole("link", { name: new RegExp(email) });
}

test("paciente edita os dados pessoais, cancela, salva e vê o que salvou após recarregar", async ({
  page,
  request,
}) => {
  const nomeInicial = "Paciente Perfil Inicial";
  const nomeSalvo = "Paciente Perfil Salvo";
  const telefoneSalvo = "11977776666";
  // Fora da edição a tela mostra o telefone formatado.
  const telefoneSalvoNaTela = "(11) 97777-6666";
  const { email } = await criarPacienteConfirmado({ request, page, nome: nomeInicial });
  const nome = page.getByLabel("Nome", { exact: true });
  const telefone = page.getByLabel("Telefone", { exact: true });

  await test.step("Paciente novo entra e abre o perfil com os dados do cadastro", async () => {
    await entrar({ page, email });
    await expect(page).toHaveURL("/paciente");
    await page.goto("/paciente/perfil");
    await expect(nome).toHaveValue(nomeInicial);
    await expect(telefone).toHaveValue("");
    await expect(page.getByText("01/01/1990")).toBeVisible();
    await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  });

  await test.step("Editar libera nome, telefone e nascimento, mas o e-mail continua só leitura", async () => {
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(nome).toBeEnabled();
    await expect(telefone).toBeEnabled();
    await expect(page.getByLabel("Data de nascimento")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /e-?mail/i })).toHaveCount(0);
    await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  });

  await test.step("Cancelar descarta o que foi digitado", async () => {
    await nome.fill("Nome Descartado");
    await telefone.fill("11900001111");
    await page.getByLabel("Data de nascimento").fill("1970-12-31");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(nome).toHaveValue(nomeInicial);
    await expect(nome).toBeDisabled();
    await expect(telefone).toHaveValue("");
    await expect(page.getByText("01/01/1990")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toHaveCount(0);
  });

  await test.step("Salvar mostra os dados novos na tela", async () => {
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await nome.fill(nomeSalvo);
    await telefone.fill(telefoneSalvo);
    await page.getByLabel("Data de nascimento").fill("1985-03-14");
    const resposta = page.waitForResponse(
      (r) => r.url() === `${API_URL}/users/me` && r.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    expect((await resposta).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toHaveCount(0);
    await expect(nome).toHaveValue(nomeSalvo);
    await expect(telefone).toHaveValue(telefoneSalvoNaTela);
    await expect(page.getByText("14/03/1985")).toBeVisible();
    await expect(linkDaSidebar(page, email)).toContainText(nomeSalvo);
  });

  await test.step("Recarregar mantém os dados salvos", async () => {
    await page.reload();
    await expect(nome).toHaveValue(nomeSalvo);
    await expect(telefone).toHaveValue(telefoneSalvoNaTela);
    await expect(page.getByText("14/03/1985")).toBeVisible();
    expect(await perfilDaApi({ request, email })).toMatchObject({
      name: nomeSalvo,
      phone: telefoneSalvo,
      data_nascimento: "1985-03-14",
      email,
    });
  });

  await test.step("API recusa trocar o e-mail pelo perfil", async () => {
    const resposta = await atualizarPerfilPelaApi({
      request,
      email,
      corpo: { email: novoEmail("paciente") },
    });
    expect(resposta.status()).toBe(422);
    expect((await perfilDaApi({ request, email })).email).toBe(email);
  });
});

test("profissional edita os dados profissionais sem conseguir se declarar vinculado à Hality", async ({
  page,
  request,
}) => {
  const nomeSalvo = "Profissional Perfil Salvo";
  const telefoneSalvo = "11955554444";
  const telefoneSalvoNaTela = "(11) 95555-4444";
  const registroSalvo = "CRO-9999";
  const especialidadeSalva = "Ortodontia";
  const { email } = await criarContaPeloAdmin({
    request,
    papel: "profissional",
    nome: "Profissional Perfil Inicial",
    telefone: "11911112222",
    profissional: {
      registro_profissional: "CRO-1111",
      especialidade: "Clínica geral",
      vinculado_hality: false,
    },
  });
  const dialog = page.getByRole("dialog");

  await test.step("Profissional novo, não vinculado à Hality, entra e abre o perfil", async () => {
    await page.goto("/login");
    await entrar({ page, email });
    await expect(page).toHaveURL("/profissional");
    await page.goto("/profissional/perfil");
    await expect(page.getByText("Dados profissionais")).toBeVisible();
    await expect(page.getByText("(11) 91111-2222")).toBeVisible();
    await expect(page.getByText("CRO-1111")).toBeVisible();
    await expect(page.getByText("Clínica geral").first()).toBeVisible();
    await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  });

  await test.step("Editar perfil mostra só nome, telefone, especialidade e registro, sem e-mail nem vínculo com a Hality", async () => {
    await page.getByRole("button", { name: /Editar perfil/ }).click();
    await expect(dialog.getByLabel("Nome")).toHaveValue("Profissional Perfil Inicial");
    await expect(dialog.getByLabel("Telefone")).toHaveValue("11911112222");
    await expect(dialog.getByLabel("Especialidade")).toHaveValue("Clínica geral");
    await expect(dialog.getByLabel("Registro profissional")).toHaveValue("CRO-1111");
    await expect(dialog.getByRole("textbox")).toHaveCount(4);
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await expect(dialog.getByRole("switch")).toHaveCount(0);
    await expect(dialog.getByText(/Hality/i)).toHaveCount(0);
  });

  await test.step("Fechar sem salvar descarta o que foi digitado", async () => {
    await dialog.getByLabel("Nome").fill("Nome Descartado");
    await dialog.getByLabel("Registro profissional").fill("CRO-0000");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("CRO-1111")).toBeVisible();
    await page.reload();
    await expect(page.getByText("CRO-1111")).toBeVisible();
    await expect(page.getByText("Profissional Perfil Inicial").first()).toBeVisible();
    expect(await perfilDaApi({ request, email })).toMatchObject({
      name: "Profissional Perfil Inicial",
      profissional: { registro_profissional: "CRO-1111" },
    });
  });

  await test.step("Salvar mostra os dados profissionais novos", async () => {
    await page.getByRole("button", { name: /Editar perfil/ }).click();
    await dialog.getByLabel("Nome").fill(nomeSalvo);
    await dialog.getByLabel("Telefone").fill(telefoneSalvo);
    await dialog.getByLabel("Especialidade").fill(especialidadeSalva);
    await dialog.getByLabel("Registro profissional").fill(registroSalvo);
    await salvarPeloDialog(page, dialog);
    await expect(page.getByText(telefoneSalvoNaTela)).toBeVisible();
    await expect(page.getByText(registroSalvo)).toBeVisible();
    await expect(page.getByText(especialidadeSalva).first()).toBeVisible();
    await expect(linkDaSidebar(page, email)).toContainText(nomeSalvo);
  });

  await test.step("Recarregar mantém os dados e o profissional continua não vinculado à Hality", async () => {
    await page.reload();
    await expect(page.getByText(telefoneSalvoNaTela)).toBeVisible();
    await expect(page.getByText(registroSalvo)).toBeVisible();
    await expect(page.getByText(especialidadeSalva).first()).toBeVisible();
    expect(await perfilDaApi({ request, email })).toMatchObject({
      name: nomeSalvo,
      phone: telefoneSalvo,
      profissional: {
        registro_profissional: registroSalvo,
        especialidade: especialidadeSalva,
        vinculado_hality: false,
      },
    });
  });

  await test.step("API recusa autodeclarar vínculo com a Hality e trocar o e-mail", async () => {
    const vinculo = await atualizarPerfilPelaApi({
      request,
      email,
      corpo: { profissional: { vinculado_hality: true } },
    });
    expect(vinculo.status()).toBe(422);
    const troca = await atualizarPerfilPelaApi({
      request,
      email,
      corpo: { email: novoEmail("profissional") },
    });
    expect(troca.status()).toBe(422);
    expect(await perfilDaApi({ request, email })).toMatchObject({
      email,
      name: nomeSalvo,
      profissional: { registro_profissional: registroSalvo, vinculado_hality: false },
    });
  });
});

test("admin edita o próprio perfil, cancela, salva e vê o que salvou após recarregar", async ({
  page,
  request,
}) => {
  const nomeInicial = "Admin Perfil Inicial";
  const nomeSalvo = "Admin Perfil Salvo";
  const telefoneSalvo = "11944443333";
  const { id, email } = await criarContaPeloAdmin({
    request,
    papel: "admin",
    nome: nomeInicial,
    telefone: "11933332222",
  });
  const dialog = page.getByRole("dialog");

  try {
    await test.step("Admin novo entra e abre o perfil", async () => {
      await page.goto("/login");
      await entrar({ page, email });
      await expect(page).toHaveURL("/admin");
      await page.goto("/admin/perfil");
      await expect(page.getByText("Administrador do sistema")).toBeVisible();
      await expect(linkDaSidebar(page, email)).toContainText(nomeInicial);
      await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
    });

    await test.step("Editar perfil mostra o e-mail como não alterável", async () => {
      await page.getByRole("button", { name: /Editar perfil/ }).click();
      await expect(dialog.getByLabel("Nome")).toHaveValue(nomeInicial);
      await expect(dialog.getByLabel("Telefone")).toHaveValue("11933332222");
      await expect(dialog).toContainText(`E-mail: ${email} (não pode ser alterado)`);
      await expect(dialog.getByRole("textbox")).toHaveCount(2);
    });

    await test.step("Fechar sem salvar descarta o que foi digitado", async () => {
      await dialog.getByLabel("Nome").fill("Nome Descartado");
      await dialog.getByLabel("Telefone").fill("11900000000");
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();
      await expect(linkDaSidebar(page, email)).toContainText(nomeInicial);
      await page.reload();
      await expect(linkDaSidebar(page, email)).toContainText(nomeInicial);
      expect(await perfilDaApi({ request, email })).toMatchObject({
        name: nomeInicial,
        phone: "11933332222",
      });
    });

    await test.step("Salvar mostra o nome novo no perfil e na navegação", async () => {
      await page.getByRole("button", { name: /Editar perfil/ }).click();
      await dialog.getByLabel("Nome").fill(nomeSalvo);
      await dialog.getByLabel("Telefone").fill(telefoneSalvo);
      await salvarPeloDialog(page, dialog);
      await expect(linkDaSidebar(page, email)).toContainText(nomeSalvo);
      await expect(page.getByText(nomeSalvo, { exact: true }).first()).toBeVisible();
    });

    await test.step("Recarregar mantém os dados salvos", async () => {
      await page.reload();
      await expect(linkDaSidebar(page, email)).toContainText(nomeSalvo);
      await page.getByRole("button", { name: /Editar perfil/ }).click();
      await expect(dialog.getByLabel("Nome")).toHaveValue(nomeSalvo);
      await expect(dialog.getByLabel("Telefone")).toHaveValue(telefoneSalvo);
      expect(await perfilDaApi({ request, email })).toMatchObject({
        name: nomeSalvo,
        phone: telefoneSalvo,
        email,
      });
    });

    await test.step("API recusa trocar o e-mail pelo perfil", async () => {
      const resposta = await atualizarPerfilPelaApi({
        request,
        email,
        corpo: { email: novoEmail("admin") },
      });
      expect(resposta.status()).toBe(422);
      expect((await perfilDaApi({ request, email })).email).toBe(email);
    });
  } finally {
    await desativarContaPeloAdmin({ request, id });
  }
});

for (const papel of ["paciente", "profissional", "admin"] as const) {
  test(`${papel} troca a senha: senha atual errada é recusada, a antiga deixa de entrar e a nova entra`, async ({
    page,
    request,
  }) => {
    const { id, email } = await criarConta({ request, page, papel });
    const dialog = page.getByRole("dialog");

    try {
      await test.step("Conta nova entra e abre Alterar senha", async () => {
        await page.goto("/login");
        await entrar({ page, email });
        await expect(page).toHaveURL(`/${papel}`);
        await page.goto(`/${papel}/perfil`);
        await page.getByRole("button", { name: /Alterar senha/ }).click();
        await expect(dialog.getByRole("heading", { name: "Alterar senha" })).toBeVisible();
      });

      await test.step("Senha atual errada é recusada", async () => {
        await campoDeSenha(dialog, "Senha atual").fill("SenhaErrada123!");
        await campoDeSenha(dialog, "Nova senha").fill(SENHA_NOVA);
        await campoDeSenha(dialog, "Confirmar nova senha").fill(SENHA_NOVA);
        await dialog.getByRole("button", { name: "Atualizar senha" }).click();
        await expect(
          dialog.getByRole("alert").filter({ hasText: "A senha atual está incorreta." }),
        ).toBeVisible();
        await expect(dialog.getByText("Senha atualizada.")).toHaveCount(0);
      });

      await test.step("Senha atual certa troca a senha", async () => {
        await campoDeSenha(dialog, "Senha atual").fill(SENHA);
        await dialog.getByRole("button", { name: "Atualizar senha" }).click();
        await expect(
          dialog.getByRole("status").filter({ hasText: "Senha atualizada." }),
        ).toBeVisible();
      });

      await test.step("Depois de sair, a senha antiga é recusada", async () => {
        await dialog.getByRole("button", { name: "Close" }).click();
        await expect(dialog).toBeHidden();
        await page.getByRole("button", { name: "Sair da conta" }).click();
        await expect(page).toHaveURL("/login");
        await entrar({ page, email, senha: SENHA });
        await expect(
          page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." }),
        ).toBeVisible();
        await expect(page).toHaveURL("/login");
      });

      await test.step("A senha nova entra na home do papel", async () => {
        await entrar({ page, email, senha: SENHA_NOVA });
        await expect(page).toHaveURL(`/${papel}`);
        await expect(linkDaSidebar(page, email)).toBeVisible();
      });
    } finally {
      if (papel === "admin" && id) await desativarContaPeloAdmin({ request, id });
    }
  });
}
