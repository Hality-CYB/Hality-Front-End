import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import { TOKEN_STORAGE_KEY } from "../../src/lib/session";
import { entrar } from "../helpers/auth";
import { API_URL as api } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";

test("paciente responde, edita e envia avaliação com foto e consulta o histórico", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const { email } = await criarPacienteConfirmado({
    request,
    page,
    nome: "Paciente Avaliação",
    email: `avaliacao-${randomUUID()}@example.com`,
  });
  await entrar({ page, email });
  await expect(page).toHaveURL("/paciente");
  const catalogo = page.waitForResponse(
    (r) => r.url() === `${api}/anamneses/questionario` && r.request().method() === "GET",
  );
  await page.goto("/paciente/avaliacao");
  const questionario = questionarioSchema.parse(await (await catalogo).json());
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (const pergunta of questionario.perguntas) await responderPergunta({ page, pergunta });
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  const ultima = questionario.perguntas.at(-1);
  if (!ultima) throw new Error("Questionário vazio");
  await page
    .getByText(ultima.enunciado, { exact: true })
    .locator("../..")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await responderPergunta({ page, pergunta: ultima, editar: true });
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await page.getByTestId("input-galeria").setInputFiles({
    name: "lingua.png",
    mimeType: "image/png",
    buffer: imagemLingua,
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
