import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Response,
  type Route,
} from "@playwright/test";
import { z } from "zod";
import { finalidadeSchema } from "../../src/types/consentimento";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { backendUserSchema } from "../../src/types/usuario";
import { tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL } from "../helpers/config";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const trocaSchema = z.object({
  codigo: z.string().min(1),
  consentimentos: z
    .array(
      z.object({
        finalidade: finalidadeSchema,
        versao: z.string().min(1),
        aceito: z.boolean(),
      }),
    )
    .optional(),
});
const termosSchema = z.object({
  itens: z.array(
    z.object({
      finalidade: finalidadeSchema,
      versao: z.string().min(1),
      obrigatorio: z.boolean(),
    }),
  ),
});

type Troca = z.infer<typeof trocaSchema>;
type Perfil = z.infer<typeof backendUserSchema>;
type RespostaTroca =
  | { status: 200; json: { access_token: string; token_type: "bearer" } }
  | { status: 400; json: { detail: { codigo: string } } }
  | { status: 500; json: { detail: string } };

function codigoNovo() {
  return `codigo-troca-${randomUUID()}`;
}

function emailDoTeste(prefixo: string) {
  return `${prefixo}-${randomUUID()}@example.com`;
}

function perfilDe({ nome, email }: { nome: string; email: string }): Perfil {
  return backendUserSchema.parse({
    id: randomUUID(),
    email,
    name: nome,
    phone: null,
    data_nascimento: "1990-01-01",
    role: "paciente",
    is_active: true,
    is_verified: true,
  });
}

function urlExata(caminho: "/auth/google/exchange" | "/users/me") {
  return (url: URL) => `${url.origin}${url.pathname}` === `${API_URL}${caminho}`;
}

function ehGet(caminho: string) {
  return (response: Response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      `${url.origin}${url.pathname}` === `${API_URL}${caminho}`
    );
  };
}

function cabecalhosDe(route: Route) {
  const origem = route.request().headers().origin;
  if (!origem) throw new Error("Requisição interceptada sem origem");
  return {
    "access-control-allow-origin": origem,
    "access-control-allow-credentials": "true",
    vary: "Origin",
  };
}

function corpoDaTroca(route: Route): Troca {
  const texto = route.request().postData();
  const json: unknown = texto ? JSON.parse(texto) : null;
  return trocaSchema.parse(json);
}

function contarUsuarios() {
  return consultarBanco("SELECT count(*) FROM users");
}

function emailAusente(email: string) {
  if (!/^google-[a-z0-9-]+@example\.com$/.test(email))
    throw new Error("E-mail fora do padrão do teste");
  expect(consultarBanco(`SELECT count(*) FROM users WHERE email = '${email}'`)).toBe("0");
}

async function pacienteComToken({
  request,
  page,
  nome,
  email,
}: {
  request: Parameters<typeof tokenDe>[0]["request"];
  page: Page;
  nome: string;
  email: string;
}) {
  const criado = await criarPacienteConfirmado({ request, page, nome, email });
  const header = (await tokenDe({ request, email: criado.email })).Authorization;
  const prefixo = "Bearer ";
  if (!header.startsWith(prefixo)) throw new Error("Token ausente");
  return { email: criado.email, token: header.slice(prefixo.length) };
}

async function instalarRotas({
  page,
  perfil,
  resposta,
}: {
  page: Page;
  perfil: Perfil;
  resposta: RespostaTroca;
}) {
  const trocas: Troca[] = [];
  const autorizacaoTroca: Array<string | null> = [];
  const autorizacaoPerfil: Array<string | null> = [];
  await page.route(urlExata("/auth/google/exchange"), async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.continue();
      return;
    }
    trocas.push(corpoDaTroca(route));
    autorizacaoTroca.push(route.request().headers().authorization ?? null);
    await route.fulfill({
      status: resposta.status,
      headers: cabecalhosDe(route),
      json: resposta.json,
    });
  });
  await page.route(urlExata("/users/me"), async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.continue();
      return;
    }
    autorizacaoPerfil.push(route.request().headers().authorization ?? null);
    await route.fulfill({ status: 200, headers: cabecalhosDe(route), json: perfil });
  });
  return { trocas, autorizacaoTroca, autorizacaoPerfil };
}

function vigiarGoogle(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("accounts.google.com") || url.includes("/auth/google/authorize"))
      urls.push(url);
  });
  return urls;
}

async function codigoFora({
  page,
  context,
  codigo,
}: {
  page: Page;
  context: BrowserContext;
  codigo: string;
}) {
  const url = new URL(page.url());
  expect(url.searchParams.has("code")).toBe(false);
  expect(url.searchParams.has("etapa")).toBe(false);
  expect(url.searchParams.has("erro")).toBe(false);
  expect(url.href).not.toContain(codigo);
  const guardado = await page.evaluate(() => {
    const ler = (store: Storage) =>
      [...Array(store.length)].flatMap((_, indice) => {
        const chave = store.key(indice);
        if (!chave) return [];
        return [`${chave}=${store.getItem(chave) ?? ""}`];
      });
    return [...ler(localStorage), ...ler(sessionStorage), document.cookie].join("\n");
  });
  expect(guardado).not.toContain(codigo);
  expect(await page.evaluate(() => sessionStorage.getItem("hality:google_return_to"))).toBeNull();
  const cookies = (await context.cookies())
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("\n");
  expect(cookies).not.toContain(codigo);
  await expect(page.locator("body")).not.toContainText(codigo);
}

async function tokenGuardado(page: Page) {
  return page.evaluate((chave) => localStorage.getItem(chave), TOKEN_STORAGE_KEY);
}

function alerta(page: Page, texto: string) {
  return page.getByRole("alert").filter({ hasText: texto });
}

test("paciente vinculado entra direto na área do paciente", async ({ page, context, request }) => {
  test.setTimeout(60_000);
  const emailSintetico = emailDoTeste("google-vinculado");
  const codigo = codigoNovo();
  const google = vigiarGoogle(page);

  let token = "";
  let usuarios = "";
  await test.step("Um paciente próprio existe só para sustentar as rotas que não são do Google", async () => {
    const paciente = await pacienteComToken({
      request,
      page,
      nome: "Sessao Real",
      email: emailDoTeste("google-token"),
    });
    token = paciente.token;
    usuarios = contarUsuarios();
  });

  const perfil = perfilDe({ nome: "Paciente Vinculado", email: emailSintetico });
  const rotas = await test.step("A troca de código e o perfil estão interceptados", async () =>
    instalarRotas({
      page,
      perfil,
      resposta: { status: 200, json: { access_token: token, token_type: "bearer" } },
    }));

  const home = page.waitForResponse(ehGet("/home"));
  const diagnosticos = page.waitForResponse(ehGet("/diagnosticos"));
  await test.step("O retorno de sessão entra sem pedir consentimento", async () => {
    await page.goto(`/login/google?code=${encodeURIComponent(codigo)}&etapa=sessao`);
    await expect(page.getByRole("heading", { name: "Paciente Vinculado" })).toBeVisible();
    await expect(page).toHaveURL("/paciente");
    await expect(page.getByRole("link", { name: "Fazer novo diagnóstico" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nenhum diagnóstico ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(emailSintetico) })).toBeVisible();
    await expect(page.getByText("Sessao Real")).toHaveCount(0);
    expect(rotas.trocas).toEqual([{ codigo }]);
    expect(rotas.autorizacaoTroca).toEqual([null]);
    expect(rotas.autorizacaoPerfil.length).toBeGreaterThan(0);
    expect(rotas.autorizacaoPerfil.every((valor) => valor === `Bearer ${token}`)).toBe(true);
    expect((await home).status()).toBe(200);
    expect((await diagnosticos).status()).toBe(200);
    expect(await tokenGuardado(page)).toBe(token);
  });

  await test.step("O código da troca não fica na URL nem no storage", async () => {
    await codigoFora({ page, context, codigo });
    expect(google).toEqual([]);
  });

  await test.step("Recarregar continua na área e não cria conta", async () => {
    await page.reload();
    await expect(page).toHaveURL("/paciente");
    await expect(page.getByRole("heading", { name: "Paciente Vinculado" })).toBeVisible();
    expect(await tokenGuardado(page)).toBe(token);
    expect(contarUsuarios()).toBe(usuarios);
    emailAusente(emailSintetico);
  });
});

test("primeiro acesso pede consentimento antes de criar a conta", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60_000);
  const emailSintetico = emailDoTeste("google-novo");
  const codigo = codigoNovo();
  const google = vigiarGoogle(page);
  const paciente = await pacienteComToken({
    request,
    page,
    nome: "Sessao Nova",
    email: emailDoTeste("google-novo-token"),
  });
  const perfil = perfilDe({ nome: "Paciente Novo", email: emailSintetico });
  const rotas = await instalarRotas({
    page,
    perfil,
    resposta: { status: 200, json: { access_token: paciente.token, token_type: "bearer" } },
  });
  const usuarios = contarUsuarios();
  const termos = page.waitForResponse(ehGet("/consentimentos/termos"));

  await test.step("O retorno pede consentimento e ainda não troca o código", async () => {
    await page.goto(`/login/google?code=${encodeURIComponent(codigo)}&etapa=consentimento`);
    await expect(page.getByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /dados de saúde/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /treinar a inteligência/ })).not.toBeChecked();
    expect((await termos).status()).toBe(200);
    expect(rotas.trocas).toEqual([]);
    await expect(page).toHaveURL("/login/google");
    await codigoFora({ page, context, codigo });
  });

  await test.step("Sem o aceite obrigatório a conta não é criada", async () => {
    await page.getByRole("button", { name: "Aceitar e continuar" }).click();
    await expect(alerta(page, "autorize o tratamento")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    expect(rotas.trocas).toEqual([]);
    expect(contarUsuarios()).toBe(usuarios);
  });

  await test.step("O aceite obrigatório e a recusa opcional disparam uma única troca", async () => {
    const itens = termosSchema.parse(await (await termos).json()).itens;
    await page.getByRole("checkbox", { name: /dados de saúde/ }).check();
    await expect(page.getByRole("checkbox", { name: /treinar a inteligência/ })).not.toBeChecked();
    await page.getByRole("button", { name: "Aceitar e continuar" }).click();
    await expect(page.getByRole("heading", { name: "Paciente Novo" })).toBeVisible();
    await expect(page).toHaveURL("/paciente");
    expect(rotas.trocas).toEqual([
      {
        codigo,
        consentimentos: itens.map((termo) => ({
          finalidade: termo.finalidade,
          versao: termo.versao,
          aceito: termo.obrigatorio,
        })),
      },
    ]);
    expect(await tokenGuardado(page)).toBe(paciente.token);
  });

  await test.step("A conta do retorno não foi criada e o código não vazou", async () => {
    expect(contarUsuarios()).toBe(usuarios);
    emailAusente(emailSintetico);
    await codigoFora({ page, context, codigo });
    expect(google).toEqual([]);
  });
});

test("cancelamento e erro do Google mostram mensagem clara", async ({ page }) => {
  const perfil = perfilDe({ nome: "Paciente Erro", email: emailDoTeste("google-erro") });
  const rotas = await instalarRotas({
    page,
    perfil,
    resposta: { status: 500, json: { detail: "não deveria ser chamado" } },
  });

  await test.step("Cancelar não troca código e explica o que aconteceu", async () => {
    await page.goto("/login/google?erro=cancelado");
    await expect(page.getByRole("heading", { name: "Login cancelado" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Nenhuma alteração foi feita");
    await expect(page.getByRole("link", { name: "Voltar ao login" })).toBeVisible();
    await expect(page).toHaveURL("/login/google");
    expect(await tokenGuardado(page)).toBeNull();
    expect(rotas.trocas).toEqual([]);
    expect(rotas.autorizacaoPerfil).toEqual([]);
  });

  await test.step("Voltar ao login abre o formulário", async () => {
    await page.getByRole("link", { name: "Voltar ao login" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
  });

  await test.step("Erro do provedor explica a falha e não chama a troca", async () => {
    await page.goto("/login/google?erro=erro_provedor");
    await expect(page.getByRole("heading", { name: "Não foi possível entrar" })).toBeVisible();
    await expect(alerta(page, "não conseguiu concluir o login")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar ao login" })).toBeVisible();
    await expect(page).toHaveURL("/login/google");
    expect(await tokenGuardado(page)).toBeNull();
    expect(rotas.trocas).toEqual([]);
    expect(rotas.autorizacaoPerfil).toEqual([]);
  });
});

test("código recusado na troca não fica na URL, no storage nem na mensagem", async ({
  page,
  context,
}) => {
  const codigo = codigoNovo();
  const perfil = perfilDe({ nome: "Paciente Recusa", email: emailDoTeste("google-recusa") });
  const rotas = await instalarRotas({
    page,
    perfil,
    resposta: { status: 400, json: { detail: { codigo } } },
  });

  await test.step("A troca interceptada recusa o código", async () => {
    await page.goto(`/login/google?code=${encodeURIComponent(codigo)}&etapa=sessao`);
    await expect(page.getByRole("heading", { name: "Não foi possível entrar" })).toBeVisible();
    expect(rotas.trocas).toEqual([{ codigo }]);
    expect(rotas.autorizacaoPerfil).toEqual([]);
  });

  await test.step("A mensagem é clara e o código não aparece", async () => {
    await expect(alerta(page, "expirou ou já foi utilizado")).toBeVisible();
    await expect(page).toHaveURL("/login/google");
    expect(await tokenGuardado(page)).toBeNull();
    await codigoFora({ page, context, codigo });
  });
});
