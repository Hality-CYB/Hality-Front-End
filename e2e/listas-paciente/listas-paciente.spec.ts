import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { entrar, tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const ITENS_POR_PAGINA = 20;
const DIAGNOSTICOS_PAGINADOS = 25;
const FUSO = "America/Sao_Paulo";
const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

test.use({ viewport: { width: 390, height: 844 } });

async function criarPacienteComDiagnosticos({
  request,
  page,
  quantidade,
}: {
  request: APIRequestContext;
  page: Page;
  quantidade: number;
}) {
  const { email } = await criarPacienteConfirmado({ request, page });
  const headers = await tokenDe({ request, email });
  const criados = await Promise.all(
    Array.from({ length: quantidade }, () => criarDiagnostico({ request, headers })),
  );
  return { email, ids: criados.map((criado) => String(criado.id)) };
}

async function abrirHistorico({ page, email }: { page: Page; email: string }) {
  await page.goto("/login");
  await entrar({ page, email });
  await expect(page).toHaveURL("/paciente");
  await page.getByRole("link", { name: "Progresso" }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: "Meus Diagnósticos" })).toBeVisible();
}

function diaNoCalendario(diasAtras: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(
    new Date(Date.now() - diasAtras * MILISSEGUNDOS_POR_DIA),
  );
}

function dataEmPortugues(dia: string) {
  const [ano, mes, dom] = dia.split("-");
  return `${dom}/${mes}/${ano}`;
}

function moverParaODia(id: string, dia: string) {
  const movidos = consultarBanco(
    `WITH movido AS (UPDATE diagnosticos SET data_diagnostico = TIMESTAMP '${dia} 12:00' AT TIME ZONE '${FUSO}' WHERE id = ${id} RETURNING id) SELECT count(*) FROM movido`,
  );
  expect(movidos).toBe("1");
}

function linksDeDiagnostico(page: Page) {
  return page.getByRole("link", { name: /^Diagnóstico #/ });
}

async function idsNaLista(page: Page) {
  const destinos = await linksDeDiagnostico(page).evaluateAll((links) =>
    links.map((link) => link.getAttribute("href") ?? ""),
  );
  return destinos.map((destino) => destino.split("/").pop() ?? "");
}

async function aplicarPeriodoPersonalizado({
  page,
  abrirPor,
  inicio,
  fim,
}: {
  page: Page;
  abrirPor: string | RegExp;
  inicio: string;
  fim: string;
}) {
  await page.getByRole("button", { name: abrirPor }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Período personalizado")).toBeVisible();
  const datas = dialogo.locator('input[type="date"]');
  await datas.nth(0).fill(inicio);
  await datas.nth(1).fill(fim);
  await dialogo.getByRole("button", { name: "Aplicar" }).click();
  await expect(dialogo).toBeHidden();
}

test("paciente sem exames vê o histórico vazio, sem filtros de período", async ({
  page,
  request,
}) => {
  await test.step("paciente recém-confirmado abre o histórico", async () => {
    const { email } = await criarPacienteConfirmado({ request, page });
    await abrirHistorico({ page, email });
  });

  await test.step("histórico mostra que ainda não há exames e esconde os filtros", async () => {
    await expect(page.getByText("0 exames realizados")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nenhum diagnóstico", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Faça seu primeiro diagnóstico agora.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nenhum diagnóstico neste período" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Todos", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "7 dias", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Outro período" })).toHaveCount(0);
  });
});

test("paciente filtra o histórico por período rápido e personalizado", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const quinzeDias = diaNoCalendario(15);
  const sessentaDias = diaNoCalendario(60);
  const centoEVinteDias = diaNoCalendario(120);
  const [hoje, ha15, ha60, ha120] =
    await test.step("paciente com diagnósticos de hoje, de 15, 60 e 120 dias atrás abre o histórico", async () => {
      const { email, ids } = await criarPacienteComDiagnosticos({ request, page, quantidade: 4 });
      const [idHoje, id15, id60, id120] = ids;
      if (idHoje === undefined || id15 === undefined || id60 === undefined || id120 === undefined)
        throw new Error("Diagnósticos de preparação não criados");
      moverParaODia(id15, quinzeDias);
      moverParaODia(id60, sessentaDias);
      moverParaODia(id120, centoEVinteDias);
      await abrirHistorico({ page, email });
      await expect(page.getByText("4 exames realizados")).toBeVisible();
      return [idHoje, id15, id60, id120];
    });

  await test.step("Todos mostra os quatro diagnósticos do mais recente ao mais antigo", async () => {
    await expect.poll(() => idsNaLista(page)).toEqual([hoje, ha15, ha60, ha120]);
    await expect(
      linksDeDiagnostico(page).filter({ hasText: dataEmPortugues(centoEVinteDias) }),
    ).toHaveCount(1);
  });

  await test.step("7 dias mostra só o diagnóstico de hoje", async () => {
    await page.getByRole("button", { name: "7 dias", exact: true }).click();
    await expect.poll(() => idsNaLista(page)).toEqual([hoje]);
  });

  await test.step("30 dias inclui o diagnóstico de 15 dias atrás", async () => {
    await page.getByRole("button", { name: "30 dias", exact: true }).click();
    await expect.poll(() => idsNaLista(page)).toEqual([hoje, ha15]);
  });

  await test.step("90 dias inclui o diagnóstico de 60 dias atrás e deixa de fora o de 120", async () => {
    await page.getByRole("button", { name: "90 dias", exact: true }).click();
    await expect.poll(() => idsNaLista(page)).toEqual([hoje, ha15, ha60]);
  });

  await test.step("período personalizado de um único dia mostra só o diagnóstico daquele dia", async () => {
    await aplicarPeriodoPersonalizado({
      page,
      abrirPor: "Outro período",
      inicio: sessentaDias,
      fim: sessentaDias,
    });
    await expect.poll(() => idsNaLista(page)).toEqual([ha60]);
    const [, mes, dia] = sessentaDias.split("-");
    await expect(page.getByRole("button", { name: `${dia}/${mes}–${dia}/${mes}` })).toBeVisible();
  });

  await test.step("período personalizado sem diagnósticos mostra a lista vazia do período, não a de sem exames", async () => {
    await aplicarPeriodoPersonalizado({
      page,
      abrirPor: /\d{2}\/\d{2}–\d{2}\/\d{2}/,
      inicio: diaNoCalendario(200),
      fim: diaNoCalendario(190),
    });
    await expect(
      page.getByRole("heading", { name: "Nenhum diagnóstico neste período" }),
    ).toBeVisible();
    await expect(page.getByText("Tente selecionar um período maior.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nenhum diagnóstico", exact: true }),
    ).toHaveCount(0);
    await expect(linksDeDiagnostico(page)).toHaveCount(0);
    await expect(page.getByText("4 exames realizados")).toBeVisible();
    await expect(page.getByRole("button", { name: "Todos", exact: true })).toBeVisible();
  });

  await test.step("voltar para Todos traz de volta os quatro diagnósticos", async () => {
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await expect.poll(() => idsNaLista(page)).toEqual([hoje, ha15, ha60, ha120]);
  });
});

test("rolar até o fim do histórico carrega a próxima página sem perder nem duplicar diagnósticos", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { ids } = await test.step("paciente com 25 diagnósticos abre o histórico", async () => {
    const preparado = await criarPacienteComDiagnosticos({
      request,
      page,
      quantidade: DIAGNOSTICOS_PAGINADOS,
    });
    await abrirHistorico({ page, email: preparado.email });
    await expect(page.getByText(`${DIAGNOSTICOS_PAGINADOS} exames realizados`)).toBeVisible();
    return preparado;
  });

  const primeiraPagina =
    await test.step("primeira página mostra 20 diagnósticos do paciente", async () => {
      await expect(linksDeDiagnostico(page)).toHaveCount(ITENS_POR_PAGINA);
      const naTela = await idsNaLista(page);
      expect(new Set(naTela).size).toBe(ITENS_POR_PAGINA);
      for (const id of naTela) expect(ids).toContain(id);
      return naTela;
    });

  await test.step("rolar até o último item carrega os 5 restantes", async () => {
    await linksDeDiagnostico(page).last().scrollIntoViewIfNeeded();
    await expect(linksDeDiagnostico(page)).toHaveCount(DIAGNOSTICOS_PAGINADOS);
  });

  await test.step("lista final tem cada diagnóstico criado exatamente uma vez", async () => {
    const naTela = await idsNaLista(page);
    expect([...naTela].sort()).toEqual([...ids].sort());
    expect(naTela.slice(0, ITENS_POR_PAGINA)).toEqual(primeiraPagina);
    await expect(page.getByText("Carregando mais…")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tentar carregar mais" })).toHaveCount(0);
  });
});

test("falha ao carregar a próxima página mantém os diagnósticos e permite tentar de novo", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { ids, primeiraPagina } =
    await test.step("paciente com 25 diagnósticos abre o histórico", async () => {
      const preparado = await criarPacienteComDiagnosticos({
        request,
        page,
        quantidade: DIAGNOSTICOS_PAGINADOS,
      });
      await abrirHistorico({ page, email: preparado.email });
      await expect(linksDeDiagnostico(page)).toHaveCount(ITENS_POR_PAGINA);
      return { ids: preparado.ids, primeiraPagina: await idsNaLista(page) };
    });

  const segundaPagina = (url: URL) =>
    url.href.startsWith(`${API_URL}/diagnosticos?`) && url.searchParams.get("pagina") === "2";
  const derrubarSegundaPagina = (rota: { abort: (motivo: string) => Promise<void> }) =>
    rota.abort("failed");

  await test.step("próxima página falha ao rolar até o fim", async () => {
    await page.route(segundaPagina, derrubarSegundaPagina);
    await linksDeDiagnostico(page).last().scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Tentar carregar mais" })).toBeVisible({
      timeout: 15_000,
    });
  });

  await test.step("os 20 diagnósticos já carregados continuam na tela", async () => {
    await expect(linksDeDiagnostico(page)).toHaveCount(ITENS_POR_PAGINA);
    expect(await idsNaLista(page)).toEqual(primeiraPagina);
    await expect(page.getByRole("heading", { name: /^Nenhum diagnóstico/ })).toHaveCount(0);
  });

  await test.step("tentar de novo com a API respondendo carrega o restante sem duplicar", async () => {
    await page.unroute(segundaPagina, derrubarSegundaPagina);
    await page.getByRole("button", { name: "Tentar carregar mais" }).click();
    await expect(linksDeDiagnostico(page)).toHaveCount(DIAGNOSTICOS_PAGINADOS);
    const naTela = await idsNaLista(page);
    expect([...naTela].sort()).toEqual([...ids].sort());
    expect(new Set(naTela).size).toBe(DIAGNOSTICOS_PAGINADOS);
    await expect(page.getByRole("button", { name: "Tentar carregar mais" })).toHaveCount(0);
  });
});
