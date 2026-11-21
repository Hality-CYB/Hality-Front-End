import { randomUUID } from "node:crypto";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL, SENHA } from "../helpers/config";
import { obterLinkEmail } from "../emails";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";
import { imagemLingua } from "../helpers/imagem";

async function capturar(page: Page, testInfo: TestInfo, nome: string) {
  await testInfo.attach(nome, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
}

async function conferirLargura(page: Page, largura: number) {
  // O resize do navegador pode retornar antes da atualização das medidas de rolagem.
  // Aguarda o layout, sem tolerar conteúdo maior que o viewport após estabilizar.
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          viewport: window.innerWidth,
          conteudo: document.documentElement.scrollWidth,
          semOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        })),
      { message: `A página deve caber no viewport de ${largura}px, sem rolagem horizontal` },
    )
    .toMatchObject({ viewport: largura, semOverflow: true });
}

async function solicitar(page: Page, email: string) {
  await page.goto("/registro-profissional");
  await page.getByLabel("Nome completo *").fill("Profissional Solicitação E2E");
  await page.getByLabel("E-mail *").fill(email);
  await page.getByLabel("Registro profissional *").fill("CRO-RS E2E 123");
  await page.getByLabel("Especialidade *").fill("Odontologia");
  await page.getByRole("checkbox", { name: /Termos de Uso/ }).check();
  await page.getByRole("button", { name: "Solicitar acesso profissional", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Solicitação enviada" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("somente após aprovação");
}

test("solicitação aprovada ativa profissional, que avalia paciente convidado sem perder o histórico", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(120_000);
  const email = `prof-aprovado-${randomUUID()}@example.com`;
  await solicitar(page, email);
  await capturar(page, testInfo, "solicitacao-enviada");
  expect(
    (
      await request.post(`${API_URL}/auth/login`, { form: { username: email, password: SENHA } })
    ).status(),
  ).toBe(400);
  const admin = await browser.newContext();
  const adminPage = await admin.newPage();
  try {
    await adminPage.goto("/login");
    await entrar({ page: adminPage, email: "admin@hality.com" });
    await expect(adminPage).toHaveURL("/admin");
    await adminPage.goto("/admin/usuarios");
    await adminPage.getByRole("link", { name: "Analisar solicitações profissionais" }).click();
    const card = adminPage.locator('[data-slot="card"]').filter({ hasText: email });
    await expect(card.getByText("CRO-RS E2E 123")).toBeVisible();
    for (const width of [1280, 390, 320]) {
      await adminPage.setViewportSize({ width, height: 900 });
      await conferirLargura(adminPage, width);
      await capturar(adminPage, testInfo, `admin-pendente-${width}`);
    }
    await card.getByRole("button", { name: "Aprovar", exact: true }).click();
    await expect(adminPage.getByRole("alertdialog")).toContainText("Confirme que verificou");
    await capturar(adminPage, testInfo, "confirmar-aprovacao-mobile");
    await adminPage.getByRole("button", { name: "Confirmar aprovação" }).click();
    await expect(
      adminPage.getByRole("status").filter({ hasText: "Solicitação aprovada" }),
    ).toBeVisible();
  } finally {
    await admin.close();
  }
  const link = await obterLinkEmail({ destinatario: email, finalidade: "professional_approved" });
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Ative sua conta" })).toBeVisible();
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(SENHA);
  await page.getByRole("checkbox", { name: /Termos de Uso/ }).check();
  await page.getByRole("button", { name: "Ativar conta" }).click();
  await expect(
    page.getByText("Conta ativada! Entre com o seu e-mail e a senha que você criou."),
  ).toBeVisible();
  await page.goto("/login");
  await entrar({ page, email });
  await expect(page).toHaveURL("/profissional");
  const pacienteEmail = `paciente-prof-novo-${randomUUID()}@example.com`;
  const questionario = questionarioSchema.parse(
    await (await request.get(`${API_URL}/anamneses/questionario`)).json(),
  );
  await page.goto("/profissional/avaliacao");
  await page.getByRole("button", { name: "Cadastrar novo paciente" }).click();
  await page.getByLabel("Nome completo *").fill("Paciente Profissional Novo");
  await page.getByLabel("E-mail *").fill(pacienteEmail);
  await page.getByLabel("Data de nascimento *").fill("1990-01-01");
  await page.getByRole("button", { name: "Cadastrar e continuar" }).click();
  await expect(page.getByRole("heading", { name: "Anamnese" })).toBeVisible();
  for (const pergunta of questionario.perguntas) await responderPergunta({ page, pergunta });
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page
    .getByTestId("input-galeria")
    .setInputFiles({ name: "lingua.png", mimeType: "image/png", buffer: imagemLingua });
  const diagnosticoResponse = page.waitForResponse(
    (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  const resposta = await diagnosticoResponse;
  expect(resposta.status()).toBe(202);
  const diagnostico = await resposta.json();
  const pacienteLink = await obterLinkEmail({
    destinatario: pacienteEmail,
    finalidade: "invitation",
  });
  const paciente = await browser.newContext();
  try {
    const p = await paciente.newPage();
    await p.goto(pacienteLink);
    await p.getByLabel("Senha", { exact: true }).fill(SENHA);
    await p.getByLabel("Confirmar senha", { exact: true }).fill(SENHA);
    await p.getByRole("checkbox", { name: /Termos de Uso/ }).check();
    await p.getByRole("button", { name: "Ativar conta" }).click();
    await p.getByRole("checkbox", { name: /dados de saúde/ }).check();
    await p.getByRole("button", { name: "Ativar conta" }).click();
    await expect(
      p.getByText("Conta ativada! Entre com o seu e-mail e a senha que você criou."),
    ).toBeVisible();
    await p.goto("/login");
    await entrar({ page: p, email: pacienteEmail });
    await expect(p).toHaveURL("/paciente");
    await p.goto(`/paciente/diagnosticos/${diagnostico.id}`);
    await expect(p.getByText("Resultado da IA", { exact: true })).toBeVisible();
  } finally {
    await paciente.close();
  }
});

test("recusa administrativa notifica sem criar uma conta", async ({ page, request }, testInfo) => {
  const email = `prof-recusado-${randomUUID()}@example.com`;
  await solicitar(page, email);
  await page.goto("/login");
  await entrar({ page, email: "admin@hality.com" });
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/solicitacoes-profissionais");
  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: email })
    .getByRole("button", { name: "Recusar", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar recusa" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Solicitação recusada" })).toBeVisible();
  await obterLinkEmail({ destinatario: email, finalidade: "professional_rejected" });
  await page.getByRole("button", { name: "Recusadas", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await capturar(page, testInfo, "admin-recusada");
  expect(
    (
      await request.post(`${API_URL}/auth/login`, { form: { username: email, password: SENHA } })
    ).status(),
  ).toBe(400);
});

test("duas decisões concorrentes produzem uma única conta e uma decisão definitiva", async ({
  request,
}) => {
  const email = `prof-concorrente-${randomUUID()}@example.com`;
  const headers = await tokenDe({ request, email: "admin@hality.com" });
  expect(
    (
      await request.post(`${API_URL}/auth/profissionais/solicitacoes`, {
        data: {
          nome: "Concorrência Profissional",
          email,
          registro_profissional: "CRO-RS 456",
          especialidade: "Odontologia",
          aceita_termos: true,
        },
      })
    ).status(),
  ).toBe(202);
  const lista = await (
    await request.get(`${API_URL}/admin/solicitacoes-profissionais`, { headers })
  ).json();
  const id = lista.itens.find((s: { email: string }) => s.email === email).id;
  const resultados = await Promise.all(
    ["aprovada", "recusada"].map((decisao) =>
      request.post(`${API_URL}/admin/solicitacoes-profissionais/${id}/decisao`, {
        headers,
        data: { decisao },
      }),
    ),
  );
  expect(resultados.map((r) => r.status()).sort()).toEqual([200, 409]);
});

test("cadastro profissional mantém legibilidade em desktop e celular", async ({
  page,
}, testInfo) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/registro-profissional");
    await expect(page.getByRole("heading", { name: "Cadastro profissional" })).toBeVisible();
    await conferirLargura(page, width);
    await capturar(page, testInfo, `cadastro-${width}`);
  }
});
