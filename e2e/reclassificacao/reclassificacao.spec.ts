import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { obterLinkEmail } from "../emails";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";

const NIVEIS = [
  { codigo: "halito_normal", nome: "Hálito Normal" },
  { codigo: "halitose_intima", nome: "Halitose Íntima" },
  { codigo: "mau_halito_social", nome: "Mau Hálito Social" },
] as const;

function nivel(indice: number) {
  const encontrado = NIVEIS[indice % NIVEIS.length];
  if (!encontrado) throw new Error("Classificação inválida");
  return encontrado;
}

async function diagnosticoDaCarla(request: APIRequestContext) {
  const headers = await tokenDe({ request, email: "carla.mendes@example.com" });
  return criarDiagnostico({ request, headers, statusEsperado: "aguardando_revisao" });
}

async function revisarComoProfissional(
  request: APIRequestContext,
  id: number,
  codigo: string,
): Promise<void> {
  const headers = await tokenDe({ request, email: "ana.souza@hality.com" });
  const resposta = await request.patch(`${API_URL}/profissional/diagnosticos/${id}/revisao`, {
    headers,
    data: { classificacao: codigo, observacao: "Revisão do profissional.", version: 0 },
  });
  expect(resposta.status(), await resposta.text()).toBe(200);
}

async function abrirComoAdmin(page: Page, id: number) {
  await page.goto("/login");
  await entrar({ page, email: "admin@hality.com" });
  await expect(page).toHaveURL("/admin");
  await page.goto(`/admin/diagnosticos/${id}`);
  await expect(page.getByRole("button", { name: "Reclassificar", exact: true })).toBeVisible();
}

test("admin reclassifica por cima do profissional: confirma, paciente vê e profissional é avisado", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);
  const { id, ordemIA } = await diagnosticoDaCarla(request);
  const doProfissional = nivel(ordemIA);
  const doAdmin = nivel(ordemIA + 1);
  await revisarComoProfissional(request, id, doProfissional.codigo);
  await abrirComoAdmin(page, id);

  await test.step("A classificação atual também pode ser confirmada", async () => {
    await page.getByRole("button", { name: "Reclassificar", exact: true }).click();
    await expect(
      page.getByRole("radio", { name: `${doProfissional.nome} (atual)`, exact: true }),
    ).toBeChecked();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  await test.step("A confirmação diz quem revisou e que será avisado", async () => {
    await page.getByRole("radio", { name: doAdmin.nome, exact: true }).check();
    await page.getByLabel("Observações (opcional)").fill("Curadoria da equipe Hality.");
    await page.getByRole("button", { name: "Continuar" }).click();
    const janela = page.getByRole("dialog");
    await expect(
      janela.getByText(
        `Dra. Ana Souza já revisou este diagnóstico como ${doProfissional.nome}. Ao confirmar, o resultado passa a ser ${doAdmin.nome}, e Dra. Ana Souza recebe um e-mail avisando da mudança.`,
      ),
    ).toBeVisible();
  });

  await test.step("Voltar não grava nada", async () => {
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.getByRole("radio", { name: doAdmin.nome, exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Continuar" }).click();
  });

  await test.step("Confirmar grava e atualiza o detalhe", async () => {
    await page.getByRole("button", { name: "Confirmar reclassificação" }).click();
    await expect(page.getByText("Reclassificação salva. O paciente será avisado.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Curadoria da equipe Hality.").first()).toBeVisible();
  });

  await test.step("O profissional recebe só o link, e ele abre o diagnóstico atualizado", async () => {
    await expect
      .poll(
        async () =>
          new URL(
            await obterLinkEmail({
              destinatario: "ana.souza@hality.com",
              finalidade: "diagnostic_review_override",
            }),
          ).pathname,
        { timeout: 30_000 },
      )
      .toBe(`/profissional/diagnosticos/${id}`);
    const contexto = await browser.newContext();
    try {
      const profissional = await contexto.newPage();
      await profissional.goto("/login");
      await entrar({ page: profissional, email: "ana.souza@hality.com" });
      await expect(profissional).toHaveURL("/profissional");
      await profissional.goto(`/profissional/diagnosticos/${id}`);
      await expect(profissional.getByText(`Revisão atual: ${doAdmin.nome}`)).toBeVisible();
    } finally {
      await contexto.close();
    }
  });

  await test.step("O paciente vê o resultado novo", async () => {
    const contexto = await browser.newContext();
    try {
      const paciente = await contexto.newPage();
      await paciente.goto("/login");
      await entrar({ page: paciente, email: "carla.mendes@example.com" });
      await expect(paciente).toHaveURL("/paciente");
      await paciente.goto(`/paciente/diagnosticos/${id}`);
      await expect(paciente.getByText("Curadoria da equipe Hality.")).toBeVisible();
      await expect(paciente.getByText("Revisado por Equipe Hality")).toBeVisible();
      await expect(paciente.getByText(doAdmin.nome, { exact: true }).first()).toBeVisible();
    } finally {
      await contexto.close();
    }
  });
});

test("sem revisão de profissional, a confirmação não fala em avisar ninguém", async ({
  page,
  request,
}) => {
  const { id, ordemIA } = await diagnosticoDaCarla(request);
  const novo = nivel(ordemIA);
  await abrirComoAdmin(page, id);

  await page.getByRole("button", { name: "Reclassificar", exact: true }).click();
  await page.getByRole("radio", { name: novo.nome, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  const janela = page.getByRole("dialog");
  await expect(janela.getByText(/Nenhum profissional revisou este diagnóstico/)).toBeVisible();
  await expect(janela.getByText(/já revisou este diagnóstico/)).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Aguardando revisão.")).toBeVisible();
});

test("admin desatualizado não sobrescreve a revisão que o profissional acabou de fazer", async ({
  page,
  request,
}) => {
  const { id, ordemIA } = await diagnosticoDaCarla(request);
  await abrirComoAdmin(page, id);
  await page.getByRole("button", { name: "Reclassificar", exact: true }).click();
  await page.getByRole("radio", { name: nivel(ordemIA).nome, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await revisarComoProfissional(request, id, nivel(ordemIA + 1).codigo);
  await page.getByRole("button", { name: "Confirmar reclassificação" }).click();

  await expect(page.getByText(/O diagnóstico mudou enquanto você editava/)).toBeVisible();
  await page.getByRole("button", { name: "Recarregar" }).click();
  await expect(page.getByText("Dra. Ana Souza").first()).toBeVisible();
});

for (const comProfissional of [false, true]) {
  test(`admin confirma a mesma escala ${comProfissional ? "do profissional" : "da IA"}`, async ({
    page,
    request,
  }) => {
    const { id, classificacao } = await diagnosticoDaCarla(request);
    if (comProfissional) await revisarComoProfissional(request, id, classificacao.codigo);
    await abrirComoAdmin(page, id);
    await page.getByRole("button", { name: "Reclassificar", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/sem alterar a escala/)).toBeVisible();
    const gravacao = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/admin/diagnosticos/${id}/revisao`) &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Confirmar reclassificação" }).click();
    const response = await gravacao;
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.revisao.classificacao.codigo).toBe(classificacao.codigo);
    expect(body.version).toBe(comProfissional ? 2 : 1);
    await expect(page.getByText("Reclassificação salva. O paciente será avisado.")).toBeVisible();
  });
}
