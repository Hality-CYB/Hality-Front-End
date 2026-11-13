import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { obterLinkEmail } from "../emails";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL, SENHA } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";

const CODIGOS = ["halito_normal", "halitose_intima", "mau_halito_social"] as const;
const termosSchema = z.object({
  itens: z.array(z.object({ finalidade: z.string(), versao: z.string() })),
});
const listaSchema = z.object({
  exportacao_habilitada: z.boolean(),
  itens: z.array(
    z.object({
      id: z.number(),
      dataset: z.object({ exportavel: z.boolean(), motivo: z.string().nullable() }),
    }),
  ),
});

/** Paciente que autoriza todas as finalidades, inclusive o treino com imagens. */
async function pacienteQueAutoriza({
  request,
  page,
  treino,
}: {
  request: APIRequestContext;
  page: Page;
  treino: boolean;
}) {
  const termos = termosSchema.parse(
    await (await request.get(`${API_URL}/consentimentos/termos`)).json(),
  );
  const email = `dataset-${randomUUID()}@example.com`;
  const nome = `Dataset ${treino ? "Autoriza" : "Recusa"} ${email.slice(8, 14)}`;
  const registro = await request.post(`${API_URL}/auth/register`, {
    data: {
      name: nome,
      email,
      password: SENHA,
      data_nascimento: "1990-01-01",
      consentimentos: termos.itens.map((t) => ({
        finalidade: t.finalidade,
        versao: t.versao,
        aceito: t.finalidade !== "image_training" || treino,
      })),
    },
  });
  expect(registro.status()).toBe(201);
  await page.goto(await obterLinkEmail({ destinatario: email, finalidade: "email_verification" }));
  await expect(page).toHaveURL("/login");
  return { nome, headers: await tokenDe({ request, email }) };
}

async function confirmarComoAdmin(
  request: APIRequestContext,
  id: number,
  ordemIA: number,
): Promise<void> {
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const resposta = await request.patch(`${API_URL}/admin/diagnosticos/${id}/revisao`, {
    headers: admin,
    data: { classificacao: CODIGOS[ordemIA - 1], version: 0 },
  });
  expect(resposta.status(), await resposta.text()).toBe(200);
}

async function abrirFilaDoPaciente(page: Page, nome: string) {
  await page.goto("/login");
  await entrar({ page, email: "admin@hality.com" });
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/diagnosticos");
  await expect(page.getByText(nome).first()).toBeVisible();
  await page.getByRole("button", { name: "Selecionar", exact: true }).click();
}

test("a fila mostra quem entra no dataset e por quê, sem abrir cada diagnóstico", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const autoriza = await pacienteQueAutoriza({ request, page, treino: true });
  const recusa = await pacienteQueAutoriza({ request, page, treino: false });

  const confirmado = await criarDiagnostico({
    request,
    headers: autoriza.headers,
    statusEsperado: "aguardando_revisao",
  });
  await confirmarComoAdmin(request, confirmado.id, confirmado.ordemIA);
  const pendente = await criarDiagnostico({
    request,
    headers: autoriza.headers,
    statusEsperado: "aguardando_revisao",
  });
  const semConsentimento = await criarDiagnostico({
    request,
    headers: recusa.headers,
    statusEsperado: "aguardando_revisao",
  });
  await confirmarComoAdmin(request, semConsentimento.id, semConsentimento.ordemIA);

  const detalhes: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/admin\/diagnosticos\/\d+$/.test(new URL(r.url()).pathname)) {
      detalhes.push(r.url());
    }
  });
  await abrirFilaDoPaciente(page, autoriza.nome);

  const card = (id: number) =>
    page.locator("[data-slot=card].diag-list-card").filter({ hasText: new RegExp(`#${id}(?!\d)`) });
  await expect(card(confirmado.id)).toContainText("Entra no dataset · rótulo Hality");
  await expect(card(pendente.id)).toContainText(
    "Fora do dataset: o diagnóstico ainda não foi concluído",
  );
  await expect(card(semConsentimento.id)).toContainText(
    "Fora do dataset: o paciente não autorizou o uso da imagem",
  );
  await expect(
    page.getByRole("checkbox", { name: new RegExp(`, ${pendente.id}$`) }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: new RegExp(`, ${semConsentimento.id}$`) }),
  ).toBeDisabled();

  await test.step("Tocar no card marca, e a seta continua abrindo o detalhe", async () => {
    const checkbox = page.getByRole("checkbox", { name: new RegExp(`, ${confirmado.id}$`) });
    await card(confirmado.id).getByText(autoriza.nome).click();
    await expect(checkbox).toBeChecked();
    await expect(page.getByText(/^1 diagnóstico selecionado$/)).toBeVisible();
    await card(confirmado.id).getByText(autoriza.nome).click();
    await expect(checkbox).not.toBeChecked();
  });

  expect(detalhes).toEqual([]);

  await test.step("A barra fica por cima da lista ao rolar", async () => {
    await page.mouse.wheel(0, 4000);
    const barra = page.getByRole("button", { name: "Exportar dataset" });
    await expect(barra).toBeVisible();
    // O ponto do botão precisa cair na barra, e não num card que rolou por baixo.
    const caixa = await barra.boundingBox();
    if (!caixa) throw new Error("botão sem caixa");
    const noTopo = await page.evaluate(
      ([x, y]) =>
        !!document.elementFromPoint(x, y)?.closest('[aria-label="Seleção para exportação"]'),
      [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2] as const,
    );
    expect(noTopo).toBe(true);
  });
});

test("seleciona os elegíveis e baixa o ZIP só com eles", async ({ page, request }) => {
  test.setTimeout(120_000);
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const lista = listaSchema.parse(
    await (await request.get(`${API_URL}/admin/diagnosticos?limite=1`, { headers: admin })).json(),
  );
  const autoriza = await pacienteQueAutoriza({ request, page, treino: true });
  const diagnostico = await criarDiagnostico({
    request,
    headers: autoriza.headers,
    statusEsperado: "aguardando_revisao",
  });
  await confirmarComoAdmin(request, diagnostico.id, diagnostico.ordemIA);
  await abrirFilaDoPaciente(page, autoriza.nome);

  const exportar = page.getByRole("button", { name: "Exportar dataset" });
  if (!lista.exportacao_habilitada) {
    await expect(page.getByText(/A exportação do dataset está desligada/)).toBeVisible();
    // O checkbox nativo fica escondido atrás do quadradinho: quem marca é o clique no card.
    await page.getByText(autoriza.nome).first().click();
    await expect(
      page.getByRole("checkbox", { name: new RegExp(`, ${diagnostico.id}$`) }),
    ).toBeChecked();
    await expect(exportar).toBeDisabled();
    return;
  }

  await page.getByRole("button", { name: "Selecionar elegíveis" }).click();
  await expect(page.getByRole("button", { name: "Limpar seleção" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), exportar.click()]);
  expect(download.suggestedFilename()).toMatch(/^hality-dataset-\d{8}\.zip$/);
  const caminho = await download.path();
  const zip = await readFile(caminho);
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  await expect(page.getByText(/Download iniciado/)).toBeVisible();
});

test("no celular a barra de seleção encosta no menu, sem a lista passando entre os dois", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await entrar({ page, email: "admin@hality.com" });
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/diagnosticos");
  await page.getByRole("button", { name: "Selecionar", exact: true }).click();
  const barra = page.getByRole("region", { name: "Seleção para exportação" });
  await expect(barra).toBeVisible();

  for (const rolagem of [0, 900, 9000]) {
    await page.mouse.wheel(0, rolagem);
    // Nenhum ponto entre o fim da barra e o começo do menu pode ser um card da lista.
    const cardsNaFresta = await page.evaluate(() => {
      const menu = [...document.querySelectorAll("nav")].find(
        (n) => getComputedStyle(n).display !== "none",
      );
      const caixa = document
        .querySelector('[aria-label="Seleção para exportação"]')
        ?.getBoundingClientRect();
      if (!menu || !caixa) return -1;
      const topoDoMenu = menu.getBoundingClientRect().top;
      let encontrados = 0;
      for (let y = Math.ceil(caixa.bottom); y < topoDoMenu; y++) {
        for (const x of [40, 195, 350]) {
          if (document.elementFromPoint(x, y)?.closest("[data-slot=card]")) encontrados++;
        }
      }
      return encontrados;
    });
    expect(cardsNaFresta).toBe(0);
  }
});
