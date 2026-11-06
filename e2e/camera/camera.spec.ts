import { randomUUID } from "node:crypto";
import { devices, expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import { questionarioSchema, responderPergunta } from "../helpers/questionario";

test.use({
  channel: "chromium",
  launchOptions: { args: ["--use-fake-device-for-media-stream"] },
});

const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
const celular = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };

const viewports = [
  { nome: "desktop", dispositivo: {}, rotuloGaleria: "Escolher da galeria" },
  { nome: "mobile", dispositivo: celular, rotuloGaleria: "Galeria" },
] as const;

const diagnosticoCriadoSchema = z.object({ id: z.number() });
const diagnosticosSchema = z.object({
  total: z.number(),
  itens: z.array(z.object({ id: z.number() })),
});

async function chegarNaCaptura({ page, request }: { page: Page; request: APIRequestContext }) {
  const { email } = await criarPacienteConfirmado({
    request,
    page,
    nome: "Paciente Câmera",
    email: `camera-${randomUUID()}@example.com`,
  });
  await entrar({ page, email });
  await expect(page).toHaveURL("/paciente");
  const catalogo = page.waitForResponse(
    (r) => r.url() === `${API_URL}/anamneses/questionario` && r.request().method() === "GET",
  );
  await page.goto("/paciente/avaliacao");
  const questionario = questionarioSchema.parse(await (await catalogo).json());
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (const pergunta of questionario.perguntas)
    await responderPergunta({ page, pergunta, verificarValidacoes: false });
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await page.getByRole("button", { name: "Preparar câmera" }).click();
  await expect(page.getByRole("heading", { name: "Posicione sua língua" })).toBeVisible();
  return email;
}

function contarEnvios(page: Page) {
  const envios: string[] = [];
  page.on("request", (req) => {
    if (
      req.method() === "POST" &&
      [`${API_URL}/anamneses`, `${API_URL}/diagnosticos`].includes(req.url())
    )
      envios.push(req.url());
  });
  return envios;
}

async function expectImagemCarregada(imagem: ReturnType<Page["getByAltText"]>) {
  await expect(imagem).toBeVisible();
  await expect
    .poll(() => imagem.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

async function enviarFotoEConferirResultado({
  page,
  request,
  email,
  origemEsperada,
  envios,
}: {
  page: Page;
  request: APIRequestContext;
  email: string;
  origemEsperada: "camera" | "galeria";
  envios: string[];
}) {
  const diagnosticoCriado = page.waitForResponse(
    (r) => r.url() === `${API_URL}/diagnosticos` && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByText("Analisando sua imagem")).toBeVisible();
  const resposta = await diagnosticoCriado;
  expect(resposta.status()).toBe(202);
  const { id } = diagnosticoCriadoSchema.parse(await resposta.json());
  await expect(page.getByText("Não substitui avaliação clínica.", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await expectImagemCarregada(page.getByAltText("Imagem analisada"));
  expect(envios.filter((url) => url === `${API_URL}/anamneses`)).toHaveLength(1);
  expect(envios.filter((url) => url === `${API_URL}/diagnosticos`)).toHaveLength(1);

  const headers = await tokenDe({ request, email });
  const lista = await request.get(`${API_URL}/diagnosticos`, { headers });
  expect(lista.status()).toBe(200);
  const diagnosticos = diagnosticosSchema.parse(await lista.json());
  expect(diagnosticos.total).toBe(1);
  expect(diagnosticos.itens.map((d) => d.id)).toEqual([id]);

  await page.goto("/paciente/diagnosticos");
  await page.getByRole("link", { name: new RegExp(`Diagnóstico #${id}\\b`) }).click();
  await expectImagemCarregada(page.getByAltText("Foto da língua capturada"));

  const imagemGravada = consultarBanco(
    `SELECT parametros_captura->>'origem', (parametros_captura->>'largura')::int > 0, content_type FROM imagens WHERE diagnostico_id = ${id}`,
  );
  expect(imagemGravada).toBe(
    `${origemEsperada}|t|${origemEsperada === "camera" ? "image/jpeg" : "image/png"}`,
  );
}

for (const viewport of viewports) {
  test.describe(`viewport ${viewport.nome}`, () => {
    test.use(viewport.dispositivo);

    test.describe("com permissão de câmera", () => {
      test.use({ permissions: ["camera"] });

      test("paciente captura pela câmera com contagem, refaz e envia até o resultado", async ({
        page,
        request,
      }) => {
        test.setTimeout(60_000);
        const email = await test.step("chega à captura com a câmera ao vivo", async () => {
          const emailDoPaciente = await chegarNaCaptura({ page, request });
          await expect(page.getByText("Pronto", { exact: true })).toBeVisible();
          await expect(
            page.getByText("Coloque a língua para fora e encaixe na marcação"),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: viewport.rotuloGaleria, exact: true }),
          ).toBeVisible();
          if (viewport.nome === "mobile")
            await expect(
              page.getByRole("button", { name: "Escolher da galeria", exact: true }),
            ).toBeHidden();
          return emailDoPaciente;
        });
        const envios = contarEnvios(page);

        await test.step("conta 3, 2, 1 com galeria e voltar bloqueados", async () => {
          await page.getByRole("button", { name: "Capturar foto" }).click();
          const contagem = page.getByTestId("contagem-captura");
          await expect(contagem).toHaveText("3");
          await expect(page.getByText("Segure firme…")).toBeVisible();
          await expect(
            page.getByRole("button", { name: viewport.rotuloGaleria, exact: true }),
          ).toBeDisabled();
          await expect(page.getByRole("button", { name: "Voltar" })).toBeDisabled();
          await expect(contagem).toHaveText("2");
          await expect(contagem).toHaveText("1");
        });

        await test.step("mostra a prévia da foto capturada", async () => {
          await expect(page.getByRole("heading", { name: "Confira a foto" })).toBeVisible();
          await expect(
            page.getByText("Confira se a língua está nítida e inteira dentro da marcação"),
          ).toBeVisible();
          await expectImagemCarregada(page.getByAltText("Foto da língua", { exact: true }));
          await expect(page.getByRole("button", { name: "Usar esta foto" })).toBeVisible();
          await expect(page.getByRole("button", { name: "Capturar foto" })).toBeHidden();
        });

        await test.step("refaz a foto e volta à câmera ao vivo", async () => {
          await page.getByRole("button", { name: "Tirar outra" }).click();
          await expect(page.getByRole("heading", { name: "Posicione sua língua" })).toBeVisible();
          await expect(page.getByText("Pronto", { exact: true })).toBeVisible();
          await expect(page.getByAltText("Foto da língua", { exact: true })).toBeHidden();
          await page.getByRole("button", { name: "Capturar foto" }).click();
          await expect(page.getByRole("heading", { name: "Confira a foto" })).toBeVisible();
          await expectImagemCarregada(page.getByAltText("Foto da língua", { exact: true }));
        });

        await test.step("envia a foto da câmera e vê o resultado com a imagem gravada", async () => {
          await enviarFotoEConferirResultado({
            page,
            request,
            email,
            origemEsperada: "camera",
            envios,
          });
        });
      });
    });

    test.describe("sem permissão de câmera", () => {
      test("paciente vê o aviso de câmera bloqueada e envia a foto pela galeria", async ({
        page,
        request,
      }) => {
        test.setTimeout(60_000);
        const email =
          await test.step("chega à captura e vê o aviso de câmera bloqueada", async () => {
            const emailDoPaciente = await chegarNaCaptura({ page, request });
            await expect(
              page.getByText(
                "A câmera está bloqueada. Libere o acesso nas configurações do navegador ou envie uma foto da galeria.",
              ),
            ).toBeVisible();
            await expect(page.getByText("Pronto", { exact: true })).toBeHidden();
            await expect(
              page.getByRole("button", { name: viewport.rotuloGaleria, exact: true }),
            ).toBeVisible();
            if (viewport.nome === "mobile")
              await expect(
                page.getByRole("button", { name: "Escolher da galeria", exact: true }),
              ).toBeHidden();
            return emailDoPaciente;
          });
        const envios = contarEnvios(page);

        await test.step("escolhe a foto no seletor de arquivos da galeria", async () => {
          const seletorAberto = page.waitForEvent("filechooser");
          await page.getByRole("button", { name: viewport.rotuloGaleria, exact: true }).click();
          const seletor = await seletorAberto;
          await seletor.setFiles({
            name: "lingua.png",
            mimeType: "image/png",
            buffer: imagemLingua,
          });
          await expect(page.getByRole("heading", { name: "Confira a foto" })).toBeVisible();
          await expect(
            page.getByText("Confira se a língua aparece nítida e inteira na foto"),
          ).toBeVisible();
          await expectImagemCarregada(page.getByAltText("Foto da língua", { exact: true }));
        });

        await test.step("envia a foto da galeria e vê o resultado com a imagem gravada", async () => {
          await enviarFotoEConferirResultado({
            page,
            request,
            email,
            origemEsperada: "galeria",
            envios,
          });
        });
      });
    });
  });
}
