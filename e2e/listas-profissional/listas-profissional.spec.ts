import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL, SENHA } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import {
  backendDiagnosticoProfissionalDetalheSchema,
  backendDiagnosticoProfissionalListSchema,
} from "../../src/types/diagnostico";
import {
  backendPacienteCriadoSchema,
  backendPacienteListResponseSchema,
} from "../../src/types/paciente";

async function criarProfissional(request: APIRequestContext) {
  const email = `profissional-lista-${randomUUID()}@example.com`;
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const resposta = await request.post(`${API_URL}/admin/usuarios`, {
    headers: admin,
    data: {
      nome: "Profissional Lista",
      email,
      role: "profissional",
      senha: SENHA,
      enviar_convite: false,
    },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
  const profissional = z
    .object({ id: z.string(), email: z.string(), ativo: z.boolean() })
    .parse(await resposta.json());
  expect(profissional.email).toBe(email);
  expect(profissional.ativo).toBe(true);
  return { email, headers: await tokenDe({ request, email }) };
}

async function prepararPaciente({
  request,
  page,
  headers,
}: {
  request: APIRequestContext;
  page: Page;
  headers: { Authorization: string };
}) {
  const email = `paciente-lista-${randomUUID()}@example.com`;
  await criarPacienteConfirmado({ request, page, nome: "Paciente Lista", email });
  const vinculo = await request.post(`${API_URL}/vinculos`, {
    headers,
    data: { paciente_email: email },
  });
  expect(vinculo.status(), await vinculo.text()).toBe(201);
  return tokenDe({ request, email });
}

async function entrarProfissional(page: Page, email: string) {
  await page.goto("/login");
  await entrar({ page, email });
  await expect(page).toHaveURL("/profissional");
}

async function hrefs(locator: Locator) {
  return locator.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

async function verificarPaginacao({
  page,
  endpoint,
  links,
  esperados,
}: {
  page: Page;
  endpoint: string;
  links: Locator;
  esperados: string[];
}) {
  await expect(links).toHaveCount(20);
  const primeira = await hrefs(links);
  expect(primeira).toEqual(esperados.slice(0, 20));
  let falhar = true;
  const rota = (url: URL) =>
    url.origin === new URL(API_URL).origin &&
    url.pathname === `/api/v1/${endpoint}` &&
    url.searchParams.get("pagina") === "2";
  await page.route(rota, async (route) => {
    if (falhar && route.request().method() === "GET") await route.abort();
    else await route.continue();
  });
  try {
    await links.last().scrollIntoViewIfNeeded();
    const tentar = page.getByRole("button", { name: "Tentar carregar mais" });
    await expect(tentar).toBeVisible({ timeout: 20000 });
    expect(await hrefs(links)).toEqual(primeira);
    await expect(page).toHaveURL(/\/profissional\//);
    falhar = false;
    const pagina = page.waitForResponse(
      (response) => rota(new URL(response.url())) && response.request().method() === "GET",
    );
    await tentar.click();
    const resposta = await pagina;
    expect(resposta.status()).toBe(200);
    const dados =
      endpoint === "pacientes"
        ? backendPacienteListResponseSchema.parse(await resposta.json())
        : backendDiagnosticoProfissionalListSchema.parse(await resposta.json());
    expect(dados.pagina).toBe(2);
    expect(dados.total_paginas).toBe(2);
    await expect(links).toHaveCount(esperados.length);
    expect(await hrefs(links)).toEqual(esperados);
    expect(new Set(await hrefs(links)).size).toBe(esperados.length);
    await links.last().scrollIntoViewIfNeeded();
    await expect(tentar).toHaveCount(0);
    expect(await hrefs(links)).toEqual(esperados);
  } finally {
    await page.unroute(rota);
  }
}

test("profissional filtra diagnósticos por status e período", async ({ page, request }) => {
  test.setTimeout(90000);
  const profissional =
    await test.step("Preparar paciente vinculado com diagnóstico revisado e aguardando revisão", async () => {
      const profissional = await criarProfissional(request);
      const paciente = await prepararPaciente({ request, page, headers: profissional.headers });
      const revisado = await criarDiagnostico({
        request,
        headers: paciente,
        statusEsperado: "aguardando_revisao",
      });
      const pendente = await criarDiagnostico({
        request,
        headers: paciente,
        statusEsperado: "aguardando_revisao",
      });
      const detalheResposta = await request.get(
        `${API_URL}/profissional/diagnosticos/${revisado.id}`,
        { headers: profissional.headers },
      );
      expect(detalheResposta.ok()).toBeTruthy();
      const detalhe = backendDiagnosticoProfissionalDetalheSchema.parse(
        await detalheResposta.json(),
      );
      const revisao = await request.patch(
        `${API_URL}/profissional/diagnosticos/${revisado.id}/revisao`,
        {
          headers: profissional.headers,
          data: {
            classificacao: revisado.classificacao.codigo,
            observacao: null,
            version: detalhe.version,
          },
        },
      );
      expect(revisao.ok(), await revisao.text()).toBeTruthy();
      return { ...profissional, revisado: revisado.id, pendente: pendente.id };
    });
  const links = page.locator('a[href^="/profissional/diagnosticos/"]');
  const caminho = (id: number) => `/profissional/diagnosticos/${id}`;
  await test.step("Exibir todos os diagnósticos do profissional", async () => {
    await entrarProfissional(page, profissional.email);
    await page.goto("/profissional/diagnosticos");
    await expect(links).toHaveCount(2);
    await expect(page.locator(`a[href="${caminho(profissional.revisado)}"]`)).toContainText(
      "Revisado",
    );
    await expect(page.locator(`a[href="${caminho(profissional.pendente)}"]`)).toContainText(
      "Aguardando revisão",
    );
  });
  for (const filtro of [
    { nome: "Aguardando revisão", id: profissional.pendente },
    { nome: "Revisado", id: profissional.revisado },
  ]) {
    await test.step(`Mostrar somente diagnósticos com status ${filtro.nome}`, async () => {
      await page.getByRole("button", { name: filtro.nome, exact: true }).click();
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAttribute("href", caminho(filtro.id));
    });
  }
  await test.step("Exibir estado vazio para status sem diagnósticos", async () => {
    for (const nome of ["Processando", "Falha"]) {
      const status = nome === "Falha" ? "falha" : "processando";
      const resposta = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/v1/profissional/diagnosticos" &&
          new URL(r.url()).searchParams.get("status") === status,
      );
      await page.getByRole("button", { name: nome, exact: true }).click();
      expect(
        backendDiagnosticoProfissionalListSchema.parse(await (await resposta).json()).itens,
      ).toHaveLength(0);
      await expect(page.getByText("Nenhum resultado")).toBeVisible();
      await expect(page.getByText("Ajuste os filtros para ver mais diagnósticos.")).toBeVisible();
      await expect(links).toHaveCount(0);
    }
  });
  await test.step("Aplicar períodos rápidos mantendo o status revisado", async () => {
    await page.getByRole("button", { name: "Revisado", exact: true }).click();
    for (const [nome, dias] of [
      ["7 dias", 7],
      ["30 dias", 30],
      ["90 dias", 90],
    ] as const) {
      const resposta = page.waitForResponse((r) => {
        const url = new URL(r.url());
        const inicio = url.searchParams.get("data_inicio");
        return (
          url.pathname === "/api/v1/profissional/diagnosticos" &&
          url.searchParams.get("status") === "concluido" &&
          inicio !== null &&
          Math.abs(Date.now() - Date.parse(inicio) - dias * 86400000) < 10000
        );
      });
      await page.getByRole("button", { name: nome, exact: true }).click();
      const resultado = await resposta;
      const url = new URL(resultado.url());
      expect(url.searchParams.get("pagina")).toBe("1");
      expect(url.searchParams.get("limite")).toBe("20");
      expect(
        backendDiagnosticoProfissionalListSchema
          .parse(await resultado.json())
          .itens.map((item) => item.id),
      ).toEqual([profissional.revisado]);
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAttribute("href", caminho(profissional.revisado));
    }
  });
  const dataLocal = (dias: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(Date.now() + dias * 86400000),
    );
  const inicioAntigo = dataLocal(-365);
  const fimAntigo = dataLocal(-364);
  await test.step("Excluir diagnósticos fora do período personalizado", async () => {
    await page.getByRole("button", { name: "Outro período" }).click();
    const dialogo = page.getByRole("dialog", { name: "Período personalizado" });
    await dialogo.locator('input[type="date"]').nth(0).fill(inicioAntigo);
    await dialogo.locator('input[type="date"]').nth(1).fill(fimAntigo);
    const resposta = page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname === "/api/v1/profissional/diagnosticos" &&
        u.searchParams.get("status") === "concluido" &&
        u.searchParams.has("data_fim")
      );
    });
    await dialogo.getByRole("button", { name: "Aplicar" }).click();
    expect(
      backendDiagnosticoProfissionalListSchema.parse(await (await resposta).json()).itens,
    ).toHaveLength(0);
    await expect(page.getByText("Nenhum resultado")).toBeVisible();
  });
  await test.step("Incluir diagnósticos no período e limpar os filtros", async () => {
    const labelPeriodo = `${inicioAntigo.slice(8, 10)}/${inicioAntigo.slice(5, 7)}–${fimAntigo.slice(8, 10)}/${fimAntigo.slice(5, 7)}`;
    await page.getByRole("button", { name: labelPeriodo }).click();
    const dialogo = page.getByRole("dialog", { name: "Período personalizado" });
    await dialogo.locator('input[type="date"]').nth(0).fill(dataLocal(-2));
    await dialogo.locator('input[type="date"]').nth(1).fill(dataLocal(2));
    await dialogo.getByRole("button", { name: "Aplicar" }).click();
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute("href", caminho(profissional.revisado));
    const todos = page.getByRole("button", { name: "Todos", exact: true });
    await expect(todos).toHaveCount(2);
    await todos.nth(0).click();
    await expect(links).toHaveCount(2);
    await todos.nth(1).click();
    await expect(links).toHaveCount(2);
  });
  await test.step("Manter diagnósticos depois de recarregar", async () => {
    await page.reload();
    await expect(links).toHaveCount(2);
    expect(await hrefs(links)).toEqual([
      caminho(profissional.pendente),
      caminho(profissional.revisado),
    ]);
  });
});

test("profissional mantém diagnósticos ao falhar a próxima página e tenta novamente sem duplicar", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const dados = await test.step("Preparar mais de vinte diagnósticos próprios", async () => {
    const profissional = await criarProfissional(request);
    const paciente = await prepararPaciente({ request, page, headers: profissional.headers });
    const criados = await Promise.all(
      Array.from({ length: 21 }, () =>
        criarDiagnostico({
          request,
          headers: paciente,
          statusEsperado: "aguardando_revisao",
        }),
      ),
    );
    const ids = criados.map((criado) => criado.id);
    // Datas iguais: a lista desempata por id descendente, independente da ordem do Promise.all.
    const instante = "2001-06-15 15:00:00+00";
    for (const id of ids) {
      expect(
        consultarBanco(`UPDATE diagnosticos SET data_diagnostico = '${instante}' WHERE id = ${id}`),
      ).toBe("UPDATE 1");
    }
    return { profissional, ids };
  });
  await test.step("Exibir a primeira página e recuperar a próxima sem duplicar", async () => {
    await entrarProfissional(page, dados.profissional.email);
    await page.goto("/profissional/diagnosticos");
    await verificarPaginacao({
      page,
      endpoint: "profissional/diagnosticos",
      links: page.locator('a[href^="/profissional/diagnosticos/"]'),
      esperados: [...dados.ids]
        .sort((a, b) => b - a)
        .map((id) => `/profissional/diagnosticos/${id}`),
    });
  });
});

test("profissional busca pacientes por nome e e-mail e recupera a próxima página sem duplicar", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const dados = await test.step("Preparar mais de vinte pacientes vinculados", async () => {
    const profissional = await criarProfissional(request);
    const uid = randomUUID();
    const pacientes = [];
    for (let i = 1; i <= 21; i++) {
      const nome = `Paciente Lista ${String(i).padStart(2, "0")}`;
      const email = `lista-${i}-${uid}@example.com`;
      const resposta = await request.post(`${API_URL}/pacientes`, {
        headers: profissional.headers,
        data: { nome, email, data_nascimento: "1990-01-01" },
      });
      expect(resposta.status(), await resposta.text()).toBe(201);
      const paciente = backendPacienteCriadoSchema.parse(await resposta.json());
      expect(paciente.paciente_nome).toBe(nome);
      expect(paciente.paciente_email).toBe(email);
      pacientes.push(paciente);
    }
    return { profissional, pacientes };
  });
  const links = page.locator('a[href^="/profissional/pacientes/"]');
  const esperados = dados.pacientes.map((p) => `/profissional/pacientes/${p.paciente_id}`);
  await test.step("Exibir pacientes e recuperar a próxima página sem duplicar", async () => {
    await entrarProfissional(page, dados.profissional.email);
    await page.goto("/profissional/pacientes");
    await verificarPaginacao({ page, endpoint: "pacientes", links, esperados });
  });
  await test.step("Buscar pacientes pelo nome e pelo e-mail", async () => {
    const busca = page.getByPlaceholder("Buscar por nome ou e-mail...");
    for (const [indice, campo] of [
      [20, "paciente_nome"],
      [0, "paciente_email"],
    ] as const) {
      const paciente = dados.pacientes[indice];
      if (!paciente) throw new Error("Paciente esperado não encontrado");
      const termo = paciente[campo];
      const resposta = page.waitForResponse((r) => {
        const url = new URL(r.url());
        return (
          url.pathname === "/api/v1/pacientes" &&
          url.searchParams.get("busca") === termo &&
          url.searchParams.get("pagina") === "1"
        );
      });
      await busca.fill(termo);
      const resultado = backendPacienteListResponseSchema.parse(await (await resposta).json());
      expect(resultado.itens.map((p) => p.id)).toEqual([paciente.paciente_id]);
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAttribute(
        "href",
        `/profissional/pacientes/${paciente.paciente_id}`,
      );
      await expect(links).toContainText(paciente.paciente_nome);
      await expect(links).toContainText(paciente.paciente_email);
    }
  });
  await test.step("Mostrar estado vazio e restaurar a lista ao limpar a busca", async () => {
    const busca = page.getByPlaceholder("Buscar por nome ou e-mail...");
    const termo = `ausente-${randomUUID()}`;
    const resposta = page.waitForResponse((r) => {
      const url = new URL(r.url());
      return url.pathname === "/api/v1/pacientes" && url.searchParams.get("busca") === termo;
    });
    await busca.fill(termo);
    expect(
      backendPacienteListResponseSchema.parse(await (await resposta).json()).itens,
    ).toHaveLength(0);
    await expect(page.getByText("Nenhum paciente encontrado")).toBeVisible();
    await expect(page.getByText("Tente buscar por outro nome ou e-mail.")).toBeVisible();
    await expect(links).toHaveCount(0);
    await busca.clear();
    await expect(links).toHaveCount(21);
    expect(await hrefs(links)).toEqual(esperados);
    await page.reload();
    await expect(links).toHaveCount(20);
  });
});
