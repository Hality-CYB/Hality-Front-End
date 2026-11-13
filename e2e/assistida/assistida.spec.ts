import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { entrar } from "../helpers/auth";
import { conferirEnvioDaFoto, esperarImagemCarregada, observarEnvioDaFoto } from "../helpers/envio";
import { consultarBanco } from "../helpers/banco";
import { API_URL as API } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";

test("profissional avalia paciente vinculado e salva revisão", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/login");
  await entrar({ page, email: "ana.souza@hality.com" });
  await expect(page).toHaveURL(/\/profissional$/);
  const questionario = page.waitForResponse((r) => r.url() === `${API}/anamneses/questionario`);
  await page.goto("/profissional/avaliacao");
  await page.getByText("Carla Mendes", { exact: true }).click();
  const catalogo = questionarioSchema.parse(await (await questionario).json());
  for (const pergunta of catalogo.perguntas) {
    await responderPergunta({
      page,
      pergunta,
      respostaBooleana: false,
      respostaEscala: 3,
      verificarValidacoes: false,
    });
  }
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page.getByTestId("input-galeria").setInputFiles({
    name: "lingua.png",
    mimeType: "image/png",
    buffer: imagemLingua,
  });
  const envioDaFoto = observarEnvioDaFoto(page);
  await page.getByRole("button", { name: "Usar esta foto" }).filter({ visible: true }).click();
  const criado = await conferirEnvioDaFoto(envioDaFoto);
  expect(criado.status()).toBe(202);
  const { id } = await criado.json();
  expect(Number.isInteger(id)).toBe(true);
  await expect(page.getByText("Sua avaliação", { exact: true })).toBeVisible({ timeout: 30000 });
  await page
    .getByPlaceholder("Descreva suas observações clínicas...")
    .fill("Observação clínica de teste");
  await page.getByRole("button", { name: "Salvar diagnóstico" }).click();
  await expect(page.getByRole("status")).toContainText("Revisão salva");
  await page.getByRole("button", { name: "Concluir e ir ao paciente" }).click();
  await expect(page.getByText("Carla Mendes", { exact: true }).first()).toBeVisible();
  const atores = consultarBanco(
    `SELECT p.email, e.email, ae.email FROM diagnosticos d JOIN users p ON p.id = d.paciente_id JOIN users e ON e.id = d.executor_id JOIN anamneses a ON a.id = d.anamnese_id JOIN users ae ON ae.id = a.executor_id WHERE d.id = ${id}`,
  );
  expect(atores).toBe("carla.mendes@example.com|ana.souza@hality.com|ana.souza@hality.com");
  await page.goto("/profissional/perfil");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await entrar({ page, email: "carla.mendes@example.com" });
  await expect(page).toHaveURL("/paciente");
  await page.goto("/paciente/diagnosticos");
  await page.locator(`a[href="/paciente/diagnosticos/${id}"]`).click();
  await expect(page.getByText("Observação clínica de teste")).toBeVisible();
  await expect(page.getByText(/Ana Souza/).first()).toBeVisible();
  await esperarImagemCarregada(page.getByAltText("Foto da língua capturada"));
});

test("profissional cadastra paciente com convite pendente", async ({ page }) => {
  await page.goto("/login");
  await entrar({ page, email: "ana.souza@hality.com" });
  await expect(page).toHaveURL(/\/profissional$/);
  await page.goto("/profissional/avaliacao");
  await page.getByRole("button", { name: "Cadastrar novo paciente" }).click();
  await expect(page.getByText(/convite para o paciente definir/)).toBeVisible();
  const email = `assistida-${randomUUID()}@example.com`;
  await page.getByLabel("Nome completo *").fill("Paciente Assistida");
  await page.getByLabel("E-mail *").fill(email);
  await page.getByLabel("Data de nascimento *").fill("1990-01-01");
  const criacao = page.waitForResponse(
    (r) => r.url() === `${API}/pacientes` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cadastrar e continuar" }).click();
  const resposta = await criacao;
  expect(resposta.status()).toBe(201);
  const paciente = await resposta.json();
  expect(paciente).toMatchObject({ paciente_email: email, convite_pendente: true });
  expect(resposta.request().postDataJSON()).not.toHaveProperty("senha");
  expect(resposta.request().postDataJSON()).not.toHaveProperty("consentimentos");
  await expect(page.getByRole("heading", { name: "Anamnese" })).toBeVisible();
  await page.goto(`/profissional/pacientes/${paciente.paciente_id}`);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Aguardando primeiro acesso")).toBeVisible();
});
