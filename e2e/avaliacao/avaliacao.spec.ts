import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { obterLinkEmail } from "../emails";

const api = `http://localhost:${process.env.E2E_API_PORT || "8000"}/api/v1`;
const senha = "HalityE2e123!";
const questionarioSchema = z.object({
  versao: z.string().min(1),
  perguntas: z
    .array(
      z.object({
        id: z.string(),
        enunciado: z.string(),
        tipo: z.enum(["boolean", "single_choice", "text", "scale"]),
        obrigatoria: z.boolean(),
        opcoes: z.array(z.string()).nullable(),
        escala_min: z.number().nullable(),
      }),
    )
    .min(1),
});
type Pergunta = z.infer<typeof questionarioSchema>["perguntas"][number];

async function responder(page: Page, pergunta: Pergunta, editar = false) {
  await expect(page.getByText(pergunta.enunciado, { exact: true })).toBeVisible();
  if (pergunta.obrigatoria)
    await expect(page.getByText("Obrigatória", { exact: true })).toBeVisible();
  switch (pergunta.tipo) {
    case "boolean":
      await page.getByRole("button", { name: editar ? "Não" : "Sim", exact: true }).click();
      break;
    case "single_choice": {
      const opcoes = pergunta.opcoes ?? [];
      expect(opcoes.length).toBeGreaterThan(editar ? 1 : 0);
      await page.getByRole("button", { name: opcoes[editar ? 1 : 0], exact: true }).click();
      break;
    }
    case "text":
      if (pergunta.obrigatoria && !editar)
        await expect(page.getByRole("button", { name: "Próximo" })).toBeDisabled();
      await page
        .getByPlaceholder("Digite sua resposta...")
        .fill(editar ? "Resposta editada" : "Resposta de teste");
      await page.getByRole("button", { name: "Próximo" }).click();
      break;
    case "scale":
      if (pergunta.obrigatoria && !editar)
        await expect(page.getByRole("button", { name: "Próximo" })).toBeDisabled();
      await page
        .getByRole("button", {
          name: String((pergunta.escala_min ?? 1) + (editar ? 1 : 0)),
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "Próximo" }).click();
  }
}

test("paciente responde, edita e envia avaliação com foto e consulta o histórico", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const termosResponse = await request.get(`${api}/consentimentos/termos`);
  expect(termosResponse.ok()).toBeTruthy();
  const termos = z
    .object({
      itens: z.array(
        z.object({ finalidade: z.string(), versao: z.string(), obrigatorio: z.boolean() }),
      ),
    })
    .parse(await termosResponse.json());
  const email = `avaliacao-${randomUUID()}@example.com`;
  const registro = await request.post(`${api}/auth/register`, {
    data: {
      name: "Paciente Avaliação",
      email,
      password: senha,
      data_nascimento: "1990-01-01",
      consentimentos: termos.itens.map((termo) => ({
        finalidade: termo.finalidade,
        versao: termo.versao,
        aceito: termo.obrigatorio,
      })),
    },
  });
  expect(registro.status()).toBe(201);
  const link = await obterLinkEmail({ destinatario: email, finalidade: "email_verification" });
  await page.goto(link);
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("/paciente");
  const catalogo = page.waitForResponse(
    (r) => r.url() === `${api}/anamneses/questionario` && r.request().method() === "GET",
  );
  await page.goto("/paciente/avaliacao");
  const questionario = questionarioSchema.parse(await (await catalogo).json());
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (const pergunta of questionario.perguntas) await responder(page, pergunta);
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  const ultima = questionario.perguntas.at(-1);
  if (!ultima) throw new Error("Questionário vazio");
  await page
    .getByText(ultima.enunciado, { exact: true })
    .locator("../..")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await responder(page, ultima, true);
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page.getByTestId("input-galeria").setInputFiles({
    name: "lingua.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGO4U9FEU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAJAnWGowDaLoAAAAAElFTkSuQmCC",
      "base64",
    ),
  });
  await expect(page.getByText("Confira a foto", { exact: true })).toBeVisible();
  const posts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && [`${api}/anamneses`, `${api}/diagnosticos`].includes(req.url()))
      posts.push(req.url());
  });
  const anamneseCriada = page.waitForResponse(
    (r) => r.url() === `${api}/anamneses` && r.request().method() === "POST",
  );
  const diagnosticoCriado = page.waitForResponse(
    (r) => r.url() === `${api}/diagnosticos` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByText("Analisando sua imagem")).toBeVisible();
  const ar = await anamneseCriada;
  expect(ar.status()).toBe(201);
  const anamnese = z.object({ id: z.number() }).parse(await ar.json());
  const dr = await diagnosticoCriado;
  expect(dr.status()).toBe(202);
  const diagnostico = z
    .object({ id: z.number(), anamnese_id: z.number(), status: z.string() })
    .parse(await dr.json());
  expect(diagnostico).toMatchObject({ anamnese_id: anamnese.id, status: "processando" });
  await expect(page.getByText("Não substitui avaliação clínica.", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Ver orientações" }).click();
  await expect(page.getByRole("heading", { name: "Orientações para você" })).toBeVisible();
  await page.getByRole("button", { name: "Concluir diagnóstico" }).click();
  await page.goto("/paciente/diagnosticos");
  await page.getByRole("link", { name: new RegExp(`Diagnóstico #${diagnostico.id}\\b`) }).click();
  const foto = page.getByAltText("Foto da língua capturada");
  await expect(foto).toBeVisible();
  await expect
    .poll(() => foto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY);
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const anamnesesResponse = await request.get(`${api}/anamneses`, { headers });
  expect(anamnesesResponse.status()).toBe(200);
  const anamneses = z
    .array(
      z.object({
        id: z.number(),
        versao_questionario: z.string(),
        respostas: z.array(
          z.object({
            pergunta_id: z.string(),
            valor: z.union([z.boolean(), z.string(), z.number()]),
          }),
        ),
      }),
    )
    .parse(await anamnesesResponse.json());
  expect(anamneses).toHaveLength(1);
  const salva = anamneses[0];
  if (!salva) throw new Error("Anamnese não encontrada");
  expect(salva).toMatchObject({ id: anamnese.id, versao_questionario: questionario.versao });
  const respostaEditada =
    ultima.tipo === "boolean"
      ? false
      : ultima.tipo === "single_choice"
        ? ultima.opcoes?.[1]
        : ultima.tipo === "text"
          ? "Resposta editada"
          : (ultima.escala_min ?? 1) + 1;
  expect(salva.respostas.find((r) => r.pergunta_id === ultima.id)?.valor).toBe(respostaEditada);
  const diagnosticosResponse = await request.get(`${api}/diagnosticos`, { headers });
  expect(diagnosticosResponse.status()).toBe(200);
  const diagnosticos = z
    .object({ total: z.number(), itens: z.array(z.object({ id: z.number() })) })
    .parse(await diagnosticosResponse.json());
  expect(diagnosticos.total).toBe(1);
  expect(diagnosticos.itens.map((d) => d.id)).toEqual([diagnostico.id]);
  expect(posts.filter((url) => url === `${api}/anamneses`)).toHaveLength(1);
  expect(posts.filter((url) => url === `${api}/diagnosticos`)).toHaveLength(1);
});
