import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type Response,
  type Route,
} from "@playwright/test";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { entrar } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const TOKEN_INVALIDO = "access-invalido";
const REFRESH_INVALIDO = "refresh-invalido";

type EventoRede = {
  instante: number;
  fase: "pedido" | "resposta";
  method: string;
  path: string;
  status?: number;
};

function pathDaApi(url: string) {
  return url.startsWith(API_URL) ? url.slice(API_URL.length) : url;
}

function observarRede(page: Page) {
  const eventos: EventoRede[] = [];
  const noPedido = (req: Request) => {
    if (!req.url().startsWith(API_URL)) return;
    eventos.push({
      instante: Date.now(),
      fase: "pedido",
      method: req.method(),
      path: pathDaApi(req.url()),
    });
  };
  const naResposta = (res: Response) => {
    if (!res.url().startsWith(API_URL)) return;
    eventos.push({
      instante: Date.now(),
      fase: "resposta",
      method: res.request().method(),
      path: pathDaApi(res.url()),
      status: res.status(),
    });
  };
  page.on("request", noPedido);
  page.on("response", naResposta);
  return eventos;
}

function respostas(
  eventos: EventoRede[],
  desde: number,
  filtro: { method: string; path: string; status: number },
) {
  return eventos.filter(
    (evento) =>
      evento.instante >= desde &&
      evento.fase === "resposta" &&
      evento.method === filtro.method &&
      evento.path === filtro.path &&
      evento.status === filtro.status,
  );
}

function pedidos(eventos: EventoRede[], desde: number, method: string, path: string) {
  return eventos.filter(
    (evento) =>
      evento.instante >= desde &&
      evento.fase === "pedido" &&
      evento.method === method &&
      evento.path === path,
  );
}

async function tokenDeAcesso(page: Page) {
  return page.evaluate((chave) => localStorage.getItem(chave), TOKEN_STORAGE_KEY);
}

async function gravarToken(page: Page, valor: string) {
  await page.evaluate(({ chave, valor: token }) => localStorage.setItem(chave, token), {
    chave: TOKEN_STORAGE_KEY,
    valor,
  });
}

async function pacienteNaHome({
  page,
  request,
  nome,
  email,
}: {
  page: Page;
  request: Parameters<typeof criarPacienteConfirmado>[0]["request"];
  nome: string;
  email: string;
}) {
  const conta = await criarPacienteConfirmado({ request, page, nome, email });
  await entrar({ page, email: conta.email });
  await expect(page).toHaveURL("/paciente");
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  return conta;
}

async function adulterarRefresh(context: BrowserContext) {
  const atual = (await context.cookies(`${API_URL}/auth/refresh`)).find(
    (cookie) => cookie.name === "refresh_token",
  );
  expect(atual).toBeDefined();
  if (!atual) return;
  await context.addCookies([
    {
      name: atual.name,
      value: REFRESH_INVALIDO,
      domain: atual.domain,
      path: atual.path,
      httpOnly: atual.httpOnly,
      secure: atual.secure,
      sameSite: atual.sameSite,
    },
  ]);
  const trocado = (await context.cookies(`${API_URL}/auth/refresh`)).find(
    (cookie) => cookie.name === "refresh_token",
  );
  expect(trocado?.value).toBe(REFRESH_INVALIDO);
}

test("token de acesso inválido renova a sessão uma vez e o histórico abre", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const nome = "Paciente Renovação";
  await test.step("Paciente entra e vê a própria home", async () => {
    await pacienteNaHome({
      page,
      request,
      nome,
      email: `sessao-renovacao-${randomUUID()}@example.com`,
    });
  });

  await test.step("O token de acesso deixa de valer e o refresh continua válido", async () => {
    const atual = await tokenDeAcesso(page);
    expect(atual).toBeTruthy();
    await gravarToken(page, TOKEN_INVALIDO);
    expect(await tokenDeAcesso(page)).toBe(TOKEN_INVALIDO);
  });

  const eventos = observarRede(page);
  const inicio = Date.now();
  await test.step("Abrir o histórico dispara várias leituras recusadas ao mesmo tempo", async () => {
    await page.getByRole("link", { name: "Ver todos" }).click();
    await expect
      .poll(
        () =>
          eventos.filter(
            (evento) =>
              evento.instante >= inicio &&
              evento.fase === "resposta" &&
              evento.method === "GET" &&
              evento.path.startsWith("/diagnosticos") &&
              evento.status === 401,
          ).length,
      )
      .toBe(2);
    await expect
      .poll(
        () =>
          respostas(eventos, inicio, { method: "POST", path: "/auth/refresh", status: 200 }).length,
      )
      .toBe(1);
    const fimDoRefresh = respostas(eventos, inicio, {
      method: "POST",
      path: "/auth/refresh",
      status: 200,
    })[0];
    expect(fimDoRefresh).toBeDefined();
    if (!fimDoRefresh) return;
    for (const path of ["/diagnosticos?limite=1", "/diagnosticos?pagina=1&limite=20"]) {
      const pedido = pedidos(eventos, inicio, "GET", path)[0];
      expect(pedido).toBeDefined();
      if (!pedido) return;
      expect(pedido.instante).toBeLessThan(fimDoRefresh.instante);
    }
  });

  await test.step("A sessão renova uma única vez e o histórico abre", async () => {
    expect(
      respostas(eventos, inicio, { method: "POST", path: "/auth/refresh", status: 200 }),
    ).toHaveLength(1);
    for (const path of ["/diagnosticos?limite=1", "/diagnosticos?pagina=1&limite=20"]) {
      await expect
        .poll(() => respostas(eventos, inicio, { method: "GET", path, status: 200 }).length)
        .toBe(1);
    }
    await expect(page.getByText("Nenhum diagnóstico")).toBeVisible();
    await expect(page).toHaveURL("/paciente/diagnosticos");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toHaveCount(0);
    const tokenNovo = await tokenDeAcesso(page);
    expect(tokenNovo).toBeTruthy();
    expect(tokenNovo).not.toBe(TOKEN_INVALIDO);
  });
});

test("refresh inválido leva ao login e permanece lá", async ({ page, request, context }) => {
  test.setTimeout(60_000);
  await test.step("Paciente entra e vê a própria home", async () => {
    await pacienteNaHome({
      page,
      request,
      nome: "Paciente Login",
      email: `sessao-login-${randomUUID()}@example.com`,
    });
  });

  await test.step("O refresh e o token de acesso deixam de valer", async () => {
    await adulterarRefresh(context);
    await gravarToken(page, TOKEN_INVALIDO);
  });

  const eventos = observarRede(page);
  const inicio = Date.now();
  await test.step("Recarregar a área abre o login", async () => {
    await page.reload();
    await expect(page).toHaveURL("/login?redirect=%2Fpaciente");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
    expect(
      respostas(eventos, inicio, { method: "POST", path: "/auth/refresh", status: 401 }),
    ).toHaveLength(1);
    expect(await tokenDeAcesso(page)).toBeNull();
  });

  await test.step("O login não devolve para a área do paciente", async () => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Paciente Login" })).toHaveCount(0);
    expect(pedidos(eventos, inicio, "GET", "/users/me")).toHaveLength(1);
    expect(pedidos(eventos, inicio, "POST", "/auth/refresh")).toHaveLength(1);
    expect(await tokenDeAcesso(page)).toBeNull();
  });
});

test("API fora oferece tentar novamente e não desloga", async ({ page, request }) => {
  test.setTimeout(60_000);
  const nome = "Paciente Rede";
  await test.step("Paciente entra e vê a própria home", async () => {
    await pacienteNaHome({
      page,
      request,
      nome,
      email: `sessao-rede-${randomUUID()}@example.com`,
    });
  });

  const tokenAntes = await tokenDeAcesso(page);
  expect(tokenAntes).toBeTruthy();
  const abortarApi = async (route: Route) => {
    await route.abort();
  };

  await test.step("A API deixa de responder", async () => {
    await page.route(`${API_URL}/**`, abortarApi);
  });

  const eventos = observarRede(page);
  const inicio = Date.now();
  await test.step("A tela pede para tentar novamente e não vai ao login", async () => {
    await page.reload();
    await expect(page.getByText("Não foi possível carregar sua sessão.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(page).toHaveURL("/paciente");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toHaveCount(0);
    expect(await tokenDeAcesso(page)).toBe(tokenAntes);
    expect(pedidos(eventos, inicio, "POST", "/auth/refresh")).toHaveLength(0);
  });

  await test.step("Quando a API responde, tentar novamente restaura a home", async () => {
    await page.unroute(`${API_URL}/**`, abortarApi);
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { name: nome })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fazer novo diagnóstico" })).toBeVisible();
    await expect(page).toHaveURL("/paciente");
    expect(await tokenDeAcesso(page)).toBe(tokenAntes);
  });
});
