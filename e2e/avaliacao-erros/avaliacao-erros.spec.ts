import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import {
  backendDiagnosticoCreatedSchema,
  backendDiagnosticoDetailSchema,
} from "../../src/types/diagnostico";
import { entrar, tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";

const listaDiagnosticosSchema = z.object({
  total: z.number(),
  itens: z.array(z.object({ id: z.number() })),
});
const anamnesesSchema = z.array(z.object({ id: z.number() }));
const conflitoSchema = z.object({ diagnostico_id: z.number() });
const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
const pngGrande = Buffer.concat([
  imagemLingua,
  Buffer.alloc(10 * 1024 * 1024 + 1 - imagemLingua.length),
]);

function registrosDoSeed() {
  return consultarBanco(`SELECT json_build_object(
    'usuarios', (SELECT json_agg(row_to_json(u) ORDER BY u.email) FROM users u WHERE u.email IN ('admin@hality.com', 'ana.souza@hality.com', 'bruno.lima@hality.com', 'carla.mendes@example.com', 'diego.fontana@example.com', 'elisa.prado@example.com', 'nina.sem.historico@example.com')),
    'questionarios', (SELECT json_agg(row_to_json(q) ORDER BY q.versao) FROM questionarios q),
    'classificacoes', (SELECT json_agg(row_to_json(c) ORDER BY c.id) FROM classificacoes_diagnostico c),
    'conteudos', (SELECT json_agg(row_to_json(c) ORDER BY c.id) FROM conteudos c),
    'vinculos', (SELECT json_agg(row_to_json(v) ORDER BY v.paciente_id, v.profissional_id) FROM pacientes_profissionais v)
  )::text`);
}

let seedInicial: string;
test.beforeAll(() => {
  seedInicial = registrosDoSeed();
});
test.afterAll(() => {
  expect(registrosDoSeed()).toBe(seedInicial);
});

async function iniciarAvaliacao({ page, request }: { page: Page; request: APIRequestContext }) {
  const { email } = await criarPacienteConfirmado({
    request,
    page,
    email: `avaliacao-erros-${randomUUID()}@example.com`,
  });
  const headers = await tokenDe({ request, email });
  await entrar({ page, email });
  await expect(page).toHaveURL("/paciente");
  const catalogo = page.waitForResponse(
    (r) => r.url() === `${API_URL}/anamneses/questionario` && r.request().method() === "GET",
  );
  await page.goto("/paciente/avaliacao");
  const questionario = questionarioSchema.parse(await (await catalogo).json());
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  return { headers, questionario };
}

async function prepararCaptura({ page, request }: { page: Page; request: APIRequestContext }) {
  const dados = await iniciarAvaliacao({ page, request });
  for (const pergunta of dados.questionario.perguntas) await responderPergunta({ page, pergunta });
  await expect(page.getByRole("heading", { name: "Confirme suas respostas" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  return dados;
}

async function escolherFoto(
  page: Page,
  arquivo: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.getByTestId("input-galeria").setInputFiles(arquivo);
  await expect(page.getByText("Confira a foto", { exact: true })).toBeVisible();
}

async function usarFoto(page: Page) {
  await page.getByRole("button", { name: "Usar esta foto" }).filter({ visible: true }).click();
}

async function registros({
  request,
  headers,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
}) {
  const anamneses = await request.get(`${API_URL}/anamneses`, { headers });
  const diagnosticos = await request.get(`${API_URL}/diagnosticos`, { headers });
  expect(anamneses.status()).toBe(200);
  expect(diagnosticos.status()).toBe(200);
  return {
    anamneses: anamnesesSchema.parse(await anamneses.json()),
    diagnosticos: listaDiagnosticosSchema.parse(await diagnosticos.json()),
  };
}

async function confirmarHistorico({
  page,
  request,
  headers,
  id,
}: {
  page: Page;
  request: APIRequestContext;
  headers: { Authorization: string };
  id: number;
}) {
  await expect(page.getByText("Não substitui avaliação clínica.", { exact: false })).toBeVisible({
    timeout: 25_000,
  });
  const dados = await registros({ request, headers });
  expect(dados.anamneses).toHaveLength(1);
  expect(dados.diagnosticos.total).toBe(1);
  expect(dados.diagnosticos.itens.map((item) => item.id)).toEqual([id]);
  const detalhe = await request.get(`${API_URL}/diagnosticos/${id}`, { headers });
  expect(detalhe.status()).toBe(200);
  expect(backendDiagnosticoDetailSchema.parse(await detalhe.json()).anamnese.id).toBe(
    dados.anamneses[0]?.id,
  );
  await page.goto("/paciente/diagnosticos");
  await page.reload();
  await page.getByRole("link", { name: new RegExp(`Diagnóstico #${id}\\b`) }).click();
  await expect(page.getByAltText("Foto da língua capturada")).toBeVisible();
}

const arquivosInvalidos = [
  {
    titulo: "formato não permitido",
    arquivo: { name: "invalida.gif", mimeType: "image/gif", buffer: gif },
    status: 400,
    mensagem: "Formato de imagem inválido. Envie JPEG, PNG ou WEBP.",
  },
  {
    titulo: "imagem acima de 10 MB",
    arquivo: { name: "grande.png", mimeType: "image/png", buffer: pngGrande },
    status: 413,
    mensagem: "arquivo acima do tamanho máximo permitido",
  },
];

for (const caso of arquivosInvalidos) {
  test(`paciente recebe mensagem para ${caso.titulo} e envia outra foto`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const { headers } = await test.step("Paciente responde à anamnese e prepara a captura", () =>
      prepararCaptura({ page, request }));
    await test.step("Servidor rejeita a foto e informa o motivo", async () => {
      await escolherFoto(page, caso.arquivo);
      const resposta = page.waitForResponse(
        (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
      );
      await usarFoto(page);
      expect((await resposta).status()).toBe(caso.status);
      await expect(page.getByText(caso.mensagem, { exact: true })).toBeVisible();
      const dados = await registros({ request, headers });
      expect(dados.anamneses).toHaveLength(1);
      expect(dados.diagnosticos.total).toBe(0);
    });
    await test.step("Paciente envia outra foto e encontra o único diagnóstico no histórico", async () => {
      await page.getByRole("button", { name: "Enviar outra foto" }).click();
      await escolherFoto(page, { name: "lingua.png", mimeType: "image/png", buffer: imagemLingua });
      const resposta = page.waitForResponse(
        (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
      );
      await usarFoto(page);
      const criado = await resposta;
      expect(criado.status()).toBe(202);
      const { id } = backendDiagnosticoCreatedSchema.parse(await criado.json());
      await confirmarHistorico({ page, request, headers, id });
    });
  });
}

test("paciente precisa responder pergunta obrigatória antes de avançar", async ({
  page,
  request,
}) => {
  const { questionario } = await test.step("Paciente abre o questionário real", () =>
    iniciarAvaliacao({ page, request }));
  const primeira = questionario.perguntas[0];
  const segunda = questionario.perguntas[1];
  if (!primeira || !segunda) throw new Error("Questionário com menos de duas perguntas");
  await test.step("Pergunta obrigatória permanece aberta sem resposta", async () => {
    expect(primeira.obrigatoria).toBe(true);
    expect(primeira.tipo).toBe("boolean");
    await expect(page.getByText(primeira.enunciado, { exact: true })).toBeVisible();
    await expect(page.getByText("Obrigatória", { exact: true })).toBeVisible();
    await expect(page.getByText(segunda.enunciado, { exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Próximo", exact: true })).toHaveCount(0);
  });
  await test.step("Paciente responde e avança para a próxima pergunta", async () => {
    await responderPergunta({ page, pergunta: primeira });
    await expect(page.getByText(segunda.enunciado, { exact: true })).toBeVisible();
  });
});

for (const respostaPerdida of [false, true]) {
  test(
    respostaPerdida
      ? "paciente retoma diagnóstico existente após perda da resposta e conflito real"
      : "paciente tenta novamente após erro de rede sem duplicar diagnóstico",
    async ({ page, request }) => {
      test.setTimeout(90_000);
      const { headers } = await test.step("Paciente responde e escolhe uma foto", () =>
        prepararCaptura({ page, request }));
      await escolherFoto(page, { name: "lingua.png", mimeType: "image/png", buffer: imagemLingua });
      let primeiro = true;
      let idAceito: number | undefined;
      let postsDiagnostico = 0;
      let postsAnamnese = 0;
      page.on("request", (req) => {
        if (req.method() === "POST" && req.url() === `${API_URL}/anamneses`) postsAnamnese++;
        if (req.method() === "POST" && req.url() === `${API_URL}/diagnosticos`) postsDiagnostico++;
      });
      await page.route(`${API_URL}/diagnosticos`, async (route) => {
        if (route.request().method() !== "POST" || !primeiro) return route.continue();
        primeiro = false;
        if (respostaPerdida) {
          const resposta = await route.fetch({ maxRetries: 0 });
          expect(resposta.status()).toBe(202);
          idAceito = backendDiagnosticoCreatedSchema.parse(await resposta.json()).id;
        }
        await route.abort("connectionreset");
      });
      await test.step("Falha de rede oferece nova tentativa sem perder respostas", async () => {
        await usarFoto(page);
        await expect(
          page.getByText("Não foi possível conectar ao servidor. Tente novamente."),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
        const dados = await registros({ request, headers });
        expect(dados.anamneses).toHaveLength(1);
        expect(dados.diagnosticos.total).toBe(respostaPerdida ? 1 : 0);
        if (respostaPerdida)
          expect(dados.diagnosticos.itens.map((item) => item.id)).toEqual([idAceito]);
      });
      await test.step("Nova tentativa recupera um único diagnóstico no histórico", async () => {
        const resposta = page.waitForResponse(
          (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Tentar de novo" }).click();
        const reenvio = await resposta;
        expect(reenvio.status()).toBe(respostaPerdida ? 409 : 202);
        const id = respostaPerdida
          ? conflitoSchema.parse(await reenvio.json()).diagnostico_id
          : backendDiagnosticoCreatedSchema.parse(await reenvio.json()).id;
        if (respostaPerdida) expect(id).toBe(idAceito);
        await confirmarHistorico({ page, request, headers, id });
        expect(postsAnamnese).toBe(1);
        expect(postsDiagnostico).toBe(2);
      });
    },
  );
}

for (const estado of ["falha", "processando"] as const) {
  test(
    estado === "falha"
      ? "falha na análise orienta paciente a enviar outra foto"
      : "análise demorada informa timeout e permite consultar novamente",
    async ({ page, request }) => {
      test.setTimeout(90_000);
      const { headers } = await test.step("Paciente responde e escolhe uma foto", () =>
        prepararCaptura({ page, request }));
      await escolherFoto(page, { name: "lingua.png", mimeType: "image/png", buffer: imagemLingua });
      let posts = 0;
      page.on("request", (req) => {
        if (
          req.method() === "POST" &&
          [`${API_URL}/anamneses`, `${API_URL}/diagnosticos`].includes(req.url())
        )
          posts++;
      });
      const rotaDetalhe = new RegExp(`${API_URL}/diagnosticos/\\d+$`);
      await page.route(rotaDetalhe, async (route) => {
        const resposta = await route.fetch();
        expect(resposta.status()).toBe(200);
        const detalhe = backendDiagnosticoDetailSchema.parse(await resposta.json());
        await route.fulfill({
          response: resposta,
          json: { ...detalhe, status: estado, classificacao: null, confianca_ia: null },
        });
      });
      const criacao = page.waitForResponse(
        (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
      );
      await usarFoto(page);
      const resposta = await criacao;
      expect(resposta.status()).toBe(202);
      const { id } = backendDiagnosticoCreatedSchema.parse(await resposta.json());
      if (estado === "falha") {
        await test.step("Falha apresenta mensagem e oferece substituir a foto", async () => {
          await expect(
            page.getByText("Não foi possível analisar a imagem. Tente enviar outra foto."),
          ).toBeVisible();
          await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0);
          await page.getByRole("button", { name: "Enviar outra foto" }).click();
          await expect(page.getByText("Posicione sua língua", { exact: true })).toBeVisible();
          const dados = await registros({ request, headers });
          expect(dados.anamneses).toHaveLength(1);
          expect(dados.diagnosticos.total).toBe(1);
          expect(dados.diagnosticos.itens.map((item) => item.id)).toEqual([id]);
        });
      } else {
        await test.step("Espera prolongada apresenta mensagem de timeout", async () => {
          await expect(page.getByText("A análise está demorando mais que o esperado.")).toBeVisible(
            { timeout: 25_000 },
          );
          await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
        });
        await test.step("Nova consulta recupera resultado sem reenviar avaliação", async () => {
          await page.unroute(rotaDetalhe);
          await page.getByRole("button", { name: "Tentar de novo" }).click();
          await confirmarHistorico({ page, request, headers, id });
          expect(posts).toBe(2);
        });
      }
    },
  );
}
