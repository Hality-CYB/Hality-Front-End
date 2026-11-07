import { expect, test, type Page, type Response } from "@playwright/test";
import { z } from "zod";
import { backendConsentimentosSchema } from "../../src/types/consentimento";
import { entrar } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";

const urlConsentimentos = `${API_URL}/users/me/consentimentos`;
const alertaBloqueio = "autorize o tratamento dos seus dados de saúde";

function respostaDe({ page, url, metodo }: { page: Page; url: string; metodo: string }) {
  return page.waitForResponse((r) => r.url() === url && r.request().method() === metodo);
}

async function verificarConsentimentos({
  resposta,
  saude,
  ia,
}: {
  resposta: Response;
  saude: boolean;
  ia: boolean;
}) {
  expect(resposta.status()).toBe(200);
  const { consentimentos } = backendConsentimentosSchema.parse(await resposta.json());
  expect(consentimentos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ finalidade: "health_data", aceito: saude, vigente: saude }),
      expect.objectContaining({ finalidade: "image_training", aceito: ia, vigente: ia }),
    ]),
  );
}

async function abrirPrivacidade({ page, saude, ia }: { page: Page; saude: boolean; ia: boolean }) {
  const resposta = respostaDe({ page, url: urlConsentimentos, metodo: "GET" });
  await page.getByRole("button", { name: /Privacidade/ }).click();
  await verificarConsentimentos({ resposta: await resposta, saude, ia });
  const dialogo = page.getByRole("dialog", { name: "Privacidade" });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("checkbox", { name: /dados de saúde/ })).toBeChecked({
    checked: saude,
  });
  await expect(dialogo.getByRole("checkbox", { name: /treinar a inteligência/ })).toBeChecked({
    checked: ia,
  });
}

async function recarregarPrivacidade({
  page,
  saude,
  ia,
}: {
  page: Page;
  saude: boolean;
  ia: boolean;
}) {
  await page.reload();
  await abrirPrivacidade({ page, saude, ia });
}

async function decidir({
  page,
  acao,
  saude,
  ia,
}: {
  page: Page;
  acao: () => Promise<void>;
  saude: boolean;
  ia: boolean;
}) {
  const resposta = respostaDe({ page, url: urlConsentimentos, metodo: "POST" });
  await acao();
  await verificarConsentimentos({ resposta: await resposta, saude, ia });
}

async function concluirAvaliacao({ page, ia }: { page: Page; ia: boolean }) {
  const catalogo = respostaDe({ page, url: `${API_URL}/anamneses/questionario`, metodo: "GET" });
  const consentimentos = respostaDe({ page, url: urlConsentimentos, metodo: "GET" });
  await page.goto("/paciente/avaliacao");
  await verificarConsentimentos({ resposta: await consentimentos, saude: true, ia });
  const questionario = questionarioSchema.parse(await (await catalogo).json());
  await expect(page.getByRole("alert").filter({ hasText: alertaBloqueio })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Começar diagnóstico" })).toBeVisible();
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (const pergunta of questionario.perguntas) await responderPergunta({ page, pergunta });
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page.getByTestId("input-galeria").setInputFiles({
    name: "lingua.png",
    mimeType: "image/png",
    buffer: imagemLingua,
  });
  await expect(page.getByText("Confira a foto", { exact: true })).toBeVisible();
  const envios: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      [`${API_URL}/anamneses`, `${API_URL}/diagnosticos`].includes(request.url())
    )
      envios.push(request.url());
  });
  const anamneseResposta = respostaDe({ page, url: `${API_URL}/anamneses`, metodo: "POST" });
  const diagnosticoResposta = respostaDe({ page, url: `${API_URL}/diagnosticos`, metodo: "POST" });
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  const ar = await anamneseResposta;
  const dr = await diagnosticoResposta;
  expect(ar.status()).toBe(201);
  expect(dr.status()).toBe(202);
  const anamnese = z.object({ id: z.number() }).parse(await ar.json());
  const diagnostico = z.object({ id: z.number(), anamnese_id: z.number() }).parse(await dr.json());
  expect(diagnostico.anamnese_id).toBe(anamnese.id);
  await expect(page.getByText("Não substitui avaliação clínica.", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Ver orientações" }).click();
  await page.getByRole("button", { name: "Concluir diagnóstico" }).click();
  await page.goto("/paciente/diagnosticos");
  await page.getByRole("link", { name: new RegExp(`Diagnóstico #${diagnostico.id}\\b`) }).click();
  const foto = page.getByAltText("Foto da língua capturada");
  await expect(foto).toBeVisible();
  await expect
    .poll(() => foto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  expect(envios.filter((url) => url === `${API_URL}/anamneses`)).toHaveLength(1);
  expect(envios.filter((url) => url === `${API_URL}/diagnosticos`)).toHaveLength(1);
  await page.goto("/paciente/perfil");
  await abrirPrivacidade({ page, saude: true, ia });
  await recarregarPrivacidade({ page, saude: true, ia });
}

test("paciente revoga dados de saúde com confirmação, bloqueia a avaliação e volta a avaliar após restaurar", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const decisoes: string[] = [];
  const enviosClinicos: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "POST") return;
    if (req.url() === urlConsentimentos) decisoes.push(req.url());
    if ([`${API_URL}/anamneses`, `${API_URL}/diagnosticos`].includes(req.url()))
      enviosClinicos.push(req.url());
  });
  const saude = page.getByRole("checkbox", { name: /dados de saúde/ });
  await test.step("Paciente entra com consentimento de saúde ativo", async () => {
    const { email } = await criarPacienteConfirmado({
      request,
      page,
      nome: "Paciente Consentimento Saúde",
    });
    await entrar({ page, email });
    await expect(page).toHaveURL("/paciente");
    await page.goto("/paciente/perfil");
    await abrirPrivacidade({ page, saude: true, ia: false });
  });
  await test.step("Manter preserva a autorização sem registrar revogação", async () => {
    await saude.click();
    await expect(page.getByText(/Revogar mesmo assim/)).toBeVisible();
    await expect(saude).toBeChecked();
    await expect(page.getByRole("button", { name: "Revogar", exact: true })).toBeVisible();
    expect(decisoes).toHaveLength(0);
    await page.getByRole("button", { name: "Manter" }).click();
    await expect(page.getByText(/Revogar mesmo assim/)).toHaveCount(0);
    await expect(saude).toBeChecked();
    expect(decisoes).toHaveLength(0);
    await recarregarPrivacidade({ page, saude: true, ia: false });
  });
  await test.step("Confirmar a revogação desativa somente dados de saúde", async () => {
    await saude.click();
    await decidir({
      page,
      acao: () => page.getByRole("button", { name: "Revogar", exact: true }).click(),
      saude: false,
      ia: false,
    });
    await expect(saude).not.toBeChecked();
    await expect(page.getByText(/Revogar mesmo assim/)).toHaveCount(0);
    expect(decisoes).toHaveLength(1);
    await recarregarPrivacidade({ page, saude: false, ia: false });
  });
  await test.step("Sem autorização de saúde a avaliação fica bloqueada", async () => {
    const resposta = respostaDe({ page, url: urlConsentimentos, metodo: "GET" });
    await page.goto("/paciente/avaliacao");
    await verificarConsentimentos({ resposta: await resposta, saude: false, ia: false });
    await expect(page.getByRole("alert").filter({ hasText: alertaBloqueio })).toBeVisible();
    await expect(page.getByRole("button", { name: "Começar diagnóstico" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Anamnese" })).toHaveCount(0);
    expect(enviosClinicos).toHaveLength(0);
  });
  await test.step("Restaurar o consentimento persiste a autorização", async () => {
    await page.getByRole("button", { name: "Ir para Privacidade" }).click();
    await expect(page).toHaveURL("/paciente/perfil");
    await abrirPrivacidade({ page, saude: false, ia: false });
    await decidir({ page, acao: () => saude.click(), saude: true, ia: false });
    await expect(saude).toBeChecked();
    await recarregarPrivacidade({ page, saude: true, ia: false });
  });
  await test.step("Paciente conclui uma avaliação após restaurar", async () => {
    await concluirAvaliacao({ page, ia: false });
  });
});

test("paciente revoga somente o treino de IA e continua concluindo avaliações", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const decisoes: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url() === urlConsentimentos) decisoes.push(req.url());
  });
  const ia = page.getByRole("checkbox", { name: /treinar a inteligência/ });
  await test.step("Paciente autoriza saúde e treinamento de IA", async () => {
    const { email } = await criarPacienteConfirmado({
      request,
      page,
      nome: "Paciente Consentimento IA",
    });
    await entrar({ page, email });
    await expect(page).toHaveURL("/paciente");
    await page.goto("/paciente/perfil");
    await abrirPrivacidade({ page, saude: true, ia: false });
    await decidir({ page, acao: () => ia.click(), saude: true, ia: true });
    await expect(ia).toBeChecked();
    await recarregarPrivacidade({ page, saude: true, ia: true });
  });
  await test.step("Revogar treinamento de IA mantém dados de saúde autorizados", async () => {
    const antes = decisoes.length;
    await decidir({ page, acao: () => ia.click(), saude: true, ia: false });
    await expect(ia).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /dados de saúde/ })).toBeChecked();
    await expect(page.getByRole("button", { name: "Manter" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Revogar", exact: true })).toHaveCount(0);
    expect(decisoes).toHaveLength(antes + 1);
    await recarregarPrivacidade({ page, saude: true, ia: false });
  });
  await test.step("Paciente conclui uma avaliação sem autorizar treino de IA", async () => {
    await concluirAvaliacao({ page, ia: false });
  });
});
