import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const API = `http://localhost:${process.env.E2E_API_PORT || "8000"}/api/v1`;
const senha = "HalityE2e123!";

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/profissional$/);
}

test("profissional avalia paciente vinculado e salva revisão", async ({ page }) => {
  test.setTimeout(90000);
  await entrar(page, "ana.souza@hality.com");
  const questionario = page.waitForResponse((r) => r.url() === `${API}/anamneses/questionario`);
  await page.goto("/profissional/avaliacao");
  await page.getByText("Carla Mendes", { exact: true }).click();
  const catalogo = await (await questionario).json();
  for (const pergunta of catalogo.perguntas) {
    await expect(page.getByText(pergunta.enunciado, { exact: true })).toBeVisible();
    if (pergunta.tipo === "boolean") {
      await page.getByRole("button", { name: "Não", exact: true }).click();
    } else if (pergunta.tipo === "single_choice") {
      await page.getByRole("button", { name: pergunta.opcoes[0], exact: true }).click();
    } else if (pergunta.tipo === "text") {
      await page.getByPlaceholder("Digite sua resposta...").fill("Resposta de teste");
      await page.getByRole("button", { name: "Próximo" }).click();
    } else if (pergunta.tipo === "scale") {
      await page.getByRole("button", { name: "3", exact: true }).click();
      await page.getByRole("button", { name: "Próximo" }).click();
    } else {
      throw new Error(`Tipo de pergunta não suportado: ${pergunta.tipo}`);
    }
  }
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page.getByTestId("input-galeria").setInputFiles({
    name: "lingua.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  const criacaoDiagnostico = page.waitForResponse(
    (r) => r.url() === `${API}/diagnosticos` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Usar esta foto" }).filter({ visible: true }).click();
  const criado = await criacaoDiagnostico;
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
  const atores = execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "e2e/compose.yml",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "hality_e2e",
      "-d",
      "hality_e2e",
      "-At",
      "-c",
      `SELECT p.email, e.email, ae.email FROM diagnosticos d JOIN users p ON p.id = d.paciente_id JOIN users e ON e.id = d.executor_id JOIN anamneses a ON a.id = d.anamnese_id JOIN users ae ON ae.id = a.executor_id WHERE d.id = ${id}`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(atores).toBe("carla.mendes@example.com|ana.souza@hality.com|ana.souza@hality.com");
  await page.goto("/profissional/perfil");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByLabel("Email", { exact: true }).fill("carla.mendes@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("/paciente");
  await page.goto("/paciente/diagnosticos");
  await page.locator(`a[href="/paciente/diagnosticos/${id}"]`).click();
  await expect(page.getByText("Observação clínica de teste")).toBeVisible();
  await expect(page.getByText(/Ana Souza/).first()).toBeVisible();
});

test("profissional cadastra paciente com convite pendente", async ({ page }) => {
  await entrar(page, "ana.souza@hality.com");
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
