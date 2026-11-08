import { randomUUID } from "node:crypto";
import {
  expect,
  test as base,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { imagemLingua } from "../helpers/imagem";
import { videoCurto } from "./video";

const EMAIL_ADMIN = "admin@hality.com";
const ROTA_MIDIAS = `${API_URL}/admin/conteudos/midias`;
const LIMITE_IMAGEM_EM_BYTES = 10 * 1024 * 1024;

const listaSchema = z.object({
  total: z.number(),
  items: z.array(z.object({ id: z.number() })),
});
const conteudoCriadoSchema = z.object({ id: z.number() });

const arquivoImagem = { name: "lingua.png", mimeType: "image/png", buffer: imagemLingua };
const arquivoVideo = { name: "video.webm", mimeType: "video/webm", buffer: videoCurto };
const arquivoDeTexto = { name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("notas") };
const imagemAcimaDoLimite = {
  name: "grande.png",
  mimeType: "image/png",
  buffer: Buffer.concat([
    imagemLingua,
    Buffer.alloc(LIMITE_IMAGEM_EM_BYTES + 1 - imagemLingua.length),
  ]),
};

async function listarConteudosDoMarcador(
  request: APIRequestContext,
  headers: { Authorization: string },
  marcador: string,
) {
  const resposta = await request.get(`${API_URL}/admin/conteudos`, {
    headers,
    params: { q: marcador, limit: 50 },
  });
  expect(resposta.ok()).toBeTruthy();
  return listaSchema.parse(await resposta.json());
}

async function apagarConteudosDoMarcador(request: APIRequestContext, marcador: string) {
  const headers = await tokenDe({ request, email: EMAIL_ADMIN });
  const { items } = await listarConteudosDoMarcador(request, headers, marcador);
  for (const { id } of items) {
    const exclusao = await request.delete(`${API_URL}/admin/conteudos/${id}`, { headers });
    expect(exclusao.status()).toBe(204);
  }
  const { total } = await listarConteudosDoMarcador(request, headers, marcador);
  expect(total).toBe(0);
}

const test = base.extend<{ marcador: string }>({
  marcador: async ({ request }, fornecer) => {
    const marcador = `midia-${randomUUID().slice(0, 8)}`;
    try {
      await fornecer(marcador);
    } finally {
      await apagarConteudosDoMarcador(request, marcador);
    }
  },
});

async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await entrar({ page, email: EMAIL_ADMIN });
  await expect(page).toHaveURL("/admin");
}

async function abrirNovoConteudo(page: Page, formato: "Imagem" | "Vídeo") {
  await page.goto("/admin/dicas/novo");
  await page.getByRole("button", { name: formato, exact: true }).click();
}

async function enviarArquivo(page: Page, arquivo: typeof arquivoImagem) {
  const envio = page.waitForResponse(
    (resposta) => resposta.url() === ROTA_MIDIAS && resposta.request().method() === "POST",
  );
  await page.locator("#conteudo-arquivo").setInputFiles(arquivo);
  expect((await envio).status()).toBe(201);
}

async function publicarConteudoDeMidia({
  page,
  titulo,
  ordem,
}: {
  page: Page;
  titulo: string;
  ordem: number;
}) {
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Categoria").selectOption("higiene");
  await page.getByLabel("Descrição").fill(`Descrição de ${titulo}`);
  await page.getByLabel("Home do paciente").check();
  await page.getByLabel("Orientações do diagnóstico").check();
  await page.getByRole("checkbox", { name: "Hálito Normal" }).click();
  await page.getByLabel("Ordem de exibição").fill(String(ordem));
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL("/admin/dicas?aviso=publicado");
  await expect(page.getByRole("status").filter({ hasText: "Conteúdo publicado." })).toBeVisible();
}

async function esperarImagemCarregada(imagem: Locator) {
  await expect
    .poll(() => imagem.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);
}

async function esperarVideoCarregado(video: Locator) {
  await expect
    .poll(() =>
      video.evaluate(
        (el: HTMLVideoElement) =>
          el.readyState >= HTMLMediaElement.HAVE_METADATA && el.videoWidth > 0,
      ),
    )
    .toBe(true);
}

async function buscarConteudosNaLista(page: Page, marcador: string) {
  await page.goto("/admin/dicas");
  await page.getByLabel("Buscar conteúdo").fill(marcador);
  return page.getByRole("link", { name: new RegExp(marcador) });
}

test("admin publica imagem e vídeo com prévias carregadas na ordem configurada", async ({
  page,
  marcador,
}) => {
  const tituloImagem = `Imagem ${marcador}`;
  const tituloVideo = `Vídeo ${marcador}`;
  await entrarComoAdmin(page);

  await test.step("imagem enviada aparece carregada na prévia do editor", async () => {
    await abrirNovoConteudo(page, "Imagem");
    await enviarArquivo(page, arquivoImagem);
    await esperarImagemCarregada(page.getByAltText("Prévia da imagem enviada"));
    await expect(page.getByText("Trocar arquivo")).toBeVisible();
  });

  await test.step("conteúdo de imagem é publicado com ordem 1 na home e nas orientações", async () => {
    await publicarConteudoDeMidia({ page, titulo: tituloImagem, ordem: 1 });
  });

  await test.step("vídeo enviado aparece carregado na prévia do editor", async () => {
    await abrirNovoConteudo(page, "Vídeo");
    await enviarArquivo(page, arquivoVideo);
    await esperarVideoCarregado(page.getByLabel("Prévia do vídeo enviado"));
    await expect(page.getByText("Trocar arquivo")).toBeVisible();
  });

  await test.step("conteúdo de vídeo é publicado depois, com ordem 0", async () => {
    await publicarConteudoDeMidia({ page, titulo: tituloVideo, ordem: 0 });
  });

  const cardsDoMarcador = (dialogo: Locator) =>
    dialogo.getByRole("button", { name: new RegExp(marcador) });

  await test.step("prévia da home mostra o vídeo antes da imagem, com as mídias carregadas", async () => {
    await page.getByRole("button", { name: "Preview da home" }).click();
    const dialogo = page.getByRole("dialog", { name: "Preview da home do paciente" });
    await expect(cardsDoMarcador(dialogo)).toHaveText([
      new RegExp(tituloVideo),
      new RegExp(tituloImagem),
    ]);
    await esperarImagemCarregada(
      cardsDoMarcador(dialogo).filter({ hasText: tituloImagem }).locator("img"),
    );
    await esperarVideoCarregado(
      cardsDoMarcador(dialogo).filter({ hasText: tituloVideo }).locator("video"),
    );
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
  });

  await test.step("prévia das orientações mostra os dois só no nível escolhido, na mesma ordem", async () => {
    await page.getByRole("button", { name: "Preview das orientações" }).click();
    const dialogo = page.getByRole("dialog", { name: "Preview das orientações" });
    await dialogo.getByRole("radio", { name: "Hálito Normal" }).click();
    await expect(cardsDoMarcador(dialogo)).toHaveText([
      new RegExp(tituloVideo),
      new RegExp(tituloImagem),
    ]);
    await dialogo.getByRole("radio", { name: "Mau Hálito Social" }).click();
    await expect(dialogo.getByText("Carregando…")).toBeHidden();
    await expect(cardsDoMarcador(dialogo)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
  });

  await test.step("aumentar a ordem do vídeo o coloca depois da imagem na lista e na prévia da home", async () => {
    const conteudosDaLista = await buscarConteudosNaLista(page, marcador);
    await expect(conteudosDaLista).toHaveText([new RegExp(tituloVideo), new RegExp(tituloImagem)]);
    await conteudosDaLista.filter({ hasText: tituloVideo }).click();
    await esperarVideoCarregado(page.getByLabel("Prévia do vídeo enviado"));
    await page.getByLabel("Ordem de exibição").fill("2");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL("/admin/dicas?aviso=salvo");
    await expect(page.getByRole("status").filter({ hasText: "Alterações salvas." })).toBeVisible();

    const listaAtualizada = await buscarConteudosNaLista(page, marcador);
    await expect(listaAtualizada).toHaveText([new RegExp(tituloImagem), new RegExp(tituloVideo)]);
    await page.getByRole("button", { name: "Preview da home" }).click();
    const dialogo = page.getByRole("dialog", { name: "Preview da home do paciente" });
    await expect(cardsDoMarcador(dialogo)).toHaveText([
      new RegExp(tituloImagem),
      new RegExp(tituloVideo),
    ]);
  });
});

test("editor recusa formato inválido e arquivo acima do limite sem enviar à API", async ({
  page,
}) => {
  const envios: string[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() === "POST" && requisicao.url() === ROTA_MIDIAS) {
      envios.push(requisicao.url());
    }
  });
  await entrarComoAdmin(page);
  await abrirNovoConteudo(page, "Imagem");
  const alerta = page.getByRole("alert").filter({ hasText: /Formato|Arquivo/ });

  await test.step("arquivo de texto como imagem é recusado com mensagem", async () => {
    await page.locator("#conteudo-arquivo").setInputFiles(arquivoDeTexto);
    await expect(alerta).toContainText("Formato não aceito. Envie uma imagem JPEG, PNG ou WEBP.");
    await expect(page.getByText("Escolher imagem")).toBeVisible();
    await expect(page.getByAltText("Prévia da imagem enviada")).toHaveCount(0);
  });

  await test.step("imagem como vídeo é recusada com mensagem", async () => {
    await page.getByRole("button", { name: "Vídeo", exact: true }).click();
    await page.locator("#conteudo-arquivo").setInputFiles(arquivoImagem);
    await expect(alerta).toContainText("Formato não aceito. Envie um vídeo MP4 ou WEBM.");
    await expect(page.getByLabel("Prévia do vídeo enviado")).toHaveCount(0);
  });

  await test.step("imagem acima de 10 MB é recusada com mensagem", async () => {
    await page.getByRole("button", { name: "Imagem", exact: true }).click();
    await page.locator("#conteudo-arquivo").setInputFiles(imagemAcimaDoLimite);
    await expect(alerta).toContainText("Arquivo maior que 10 MB. Envie um arquivo menor.");
    await expect(page.getByAltText("Prévia da imagem enviada")).toHaveCount(0);
  });

  await test.step("nenhum arquivo recusado é enviado à API", async () => {
    expect(envios).toEqual([]);
  });
});

test("cancelar a exclusão mantém o conteúdo", async ({ page, request, marcador }) => {
  const titulo = `Texto ${marcador}`;
  const headers = await tokenDe({ request, email: EMAIL_ADMIN });
  const criacao = await request.post(`${API_URL}/admin/conteudos`, {
    headers,
    data: {
      titulo,
      categoria: "higiene",
      conteudo: { itens: [{ tipo: "texto", texto: "Conteúdo que deve permanecer." }] },
      destinos: ["home_autenticada"],
      status: "publicado",
      ordem: 0,
    },
  });
  expect(criacao.status(), await criacao.text()).toBe(201);
  const { id } = conteudoCriadoSchema.parse(await criacao.json());
  const exclusoes: string[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() === "DELETE") exclusoes.push(requisicao.url());
  });
  await entrarComoAdmin(page);

  await test.step("cancelar no diálogo de exclusão fecha o diálogo sem excluir", async () => {
    await page.goto(`/admin/dicas/${id}/editar`);
    await page.getByRole("button", { name: "Excluir conteúdo" }).click();
    const dialogo = page.getByRole("alertdialog", { name: "Excluir conteúdo" });
    await expect(dialogo).toContainText(titulo);
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByLabel("Título")).toHaveValue(titulo);
    expect(exclusoes).toEqual([]);
  });

  await test.step("conteúdo continua no editor, na lista e na API depois de recarregar", async () => {
    await page.reload();
    await expect(page.getByLabel("Título")).toHaveValue(titulo);
    const conteudosDaLista = await buscarConteudosNaLista(page, marcador);
    await expect(conteudosDaLista).toHaveCount(1);
    const consulta = await request.get(`${API_URL}/admin/conteudos/${id}`, { headers });
    expect(consulta.status()).toBe(200);
  });
});
