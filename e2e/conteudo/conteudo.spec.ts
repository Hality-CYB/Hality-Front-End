import { randomUUID } from "node:crypto";
import { expect, test as base, type Locator, type Page } from "@playwright/test";
import { backendConteudoListSchema } from "../../src/types/conteudo-admin";
import { backendDiagnosticoDetailSchema } from "../../src/types/diagnostico";
import { backendHomeSchema } from "../../src/types/home";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { imagemLingua } from "../helpers/imagem";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const EMAIL_ADMIN = "admin@hality.com";

const test = base.extend<{
  marcaDoConteudo: string;
  novaPagina: () => Promise<Page>;
}>({
  marcaDoConteudo: async ({ request }, fornecer) => {
    const marca = randomUUID().slice(0, 8);
    try {
      await fornecer(marca);
    } finally {
      const headers = await tokenDe({ request, email: EMAIL_ADMIN });
      const busca = await request.get(`${API_URL}/admin/conteudos?q=${marca}&limit=50`, {
        headers,
      });
      expect(busca.ok()).toBeTruthy();
      const { items } = backendConteudoListSchema.parse(await busca.json());
      for (const item of items) {
        const exclusao = await request.delete(`${API_URL}/admin/conteudos/${item.id}`, {
          headers,
        });
        expect(exclusao.status()).toBe(204);
      }
      const restantes = await request.get(`${API_URL}/admin/conteudos?q=${marca}&limit=50`, {
        headers,
      });
      expect(backendConteudoListSchema.parse(await restantes.json()).items).toHaveLength(0);
    }
  },
  novaPagina: async ({ browser }, fornecer) => {
    const contextos: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await fornecer(async () => {
      const contexto = await browser.newContext();
      contextos.push(contexto);
      return contexto.newPage();
    });
    for (const contexto of contextos) await contexto.close();
  },
});

async function criarPacienteLogado(
  page: Page,
  request: Parameters<typeof criarPacienteConfirmado>[0]["request"],
) {
  await page.goto("/login");
  const { email } = await criarPacienteConfirmado({ request, page });
  await entrar({ page, email });
  await expect(page).toHaveURL("/paciente");
  return email;
}

async function recarregarHome(paciente: Page) {
  const resposta = paciente.waitForResponse(
    (r) => r.url() === `${API_URL}/home` && r.request().method() === "GET",
  );
  await paciente.goto("/paciente");
  const { dicas } = backendHomeSchema.parse(await (await resposta).json());
  await expect(paciente.getByRole("heading", { name: "Dicas para você" })).toBeVisible();
  const primeira = dicas[0];
  if (primeira) await expect(paciente.getByText(primeira.titulo, { exact: true })).toBeVisible();
  return dicas.map((dica) => dica.titulo);
}

async function abrirOrientacoes(paciente: Page, diagnosticoId: number) {
  const resposta = paciente.waitForResponse(
    (r) => r.url() === `${API_URL}/diagnosticos/${diagnosticoId}` && r.request().method() === "GET",
  );
  await paciente.goto(`/paciente/diagnosticos/${diagnosticoId}`);
  const { conteudos } = backendDiagnosticoDetailSchema.parse(await (await resposta).json());
  await paciente.getByRole("button", { name: "Orientações", exact: true }).click();
  const primeira = conteudos?.[0];
  if (primeira) {
    await expect(
      paciente.getByRole("button", { name: primeira.titulo, exact: false }),
    ).toBeVisible();
  } else {
    await expect(
      paciente.getByRole("heading", { name: "Nenhuma orientação cadastrada" }),
    ).toBeVisible();
  }
  return (conteudos ?? []).map((conteudo) => conteudo.titulo);
}

async function imagemCarregada(imagem: Locator) {
  await expect
    .poll(() => imagem.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

async function abrirConteudoPelaBusca(admin: Page, marca: string) {
  await admin.goto("/admin/dicas");
  await admin.getByLabel("Buscar conteúdo").fill(marca);
  await admin.getByRole("link", { name: new RegExp(marca) }).click();
  await expect(admin.getByRole("heading", { name: "Editar conteúdo" })).toBeVisible();
}

test("dica publicada na home chega ao paciente, muda ao ser editada e some ao ser apagada", async ({
  page: admin,
  request,
  novaPagina,
  marcaDoConteudo: marca,
}) => {
  test.setTimeout(60_000);
  const titulo = `Dica E2E ${marca}`;
  const tituloEditado = `Dica E2E ${marca} atualizada`;
  const texto = `Texto original ${marca}`;
  const textoEditado = `Texto atualizado ${marca}`;
  const paciente = await novaPagina();

  await test.step("paciente novo entra na própria home", async () => {
    await criarPacienteLogado(paciente, request);
  });

  await test.step("admin publica uma dica de texto para a home do paciente", async () => {
    await admin.goto("/login");
    await entrar({ page: admin, email: EMAIL_ADMIN });
    await expect(admin).toHaveURL("/admin");
    await admin.goto("/admin/dicas");
    await admin.getByRole("link", { name: "Novo conteúdo" }).click();
    await admin.getByLabel("Título").fill(titulo);
    await admin.getByLabel("Categoria").selectOption("higiene");
    await admin.getByLabel("Texto", { exact: true }).fill(texto);
    await admin.getByLabel("Home do paciente").check();
    await admin.getByRole("button", { name: "Publicar" }).click();
    await expect(admin).toHaveURL("/admin/dicas?aviso=publicado");
    await expect(admin.getByText("Conteúdo publicado.")).toBeVisible();
  });

  await test.step("paciente vê a dica publicada na home", async () => {
    expect(await recarregarHome(paciente)).toContain(titulo);
    await expect(paciente.getByText(titulo, { exact: true })).toBeVisible();
    await expect(paciente.getByText(texto)).toBeVisible();
  });

  await test.step("admin edita o título e o texto da dica", async () => {
    await abrirConteudoPelaBusca(admin, marca);
    await admin.getByLabel("Título").fill(tituloEditado);
    await admin.getByLabel("Texto", { exact: true }).fill(textoEditado);
    await admin.getByRole("button", { name: "Salvar" }).click();
    await expect(admin).toHaveURL("/admin/dicas?aviso=salvo");
    await expect(admin.getByText("Alterações salvas.")).toBeVisible();
  });

  await test.step("paciente vê apenas a versão nova da dica", async () => {
    const titulos = await recarregarHome(paciente);
    expect(titulos).toContain(tituloEditado);
    expect(titulos).not.toContain(titulo);
    await expect(paciente.getByText(tituloEditado, { exact: true })).toBeVisible();
    await expect(paciente.getByText(textoEditado)).toBeVisible();
    await expect(paciente.getByText(titulo, { exact: true })).toHaveCount(0);
    await expect(paciente.getByText(texto)).toHaveCount(0);
  });

  await test.step("admin apaga a dica", async () => {
    await abrirConteudoPelaBusca(admin, marca);
    await admin.getByRole("button", { name: "Excluir conteúdo" }).click();
    await admin.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(admin).toHaveURL("/admin/dicas?aviso=excluido");
    await expect(admin.getByText("Conteúdo excluído.")).toBeVisible();
  });

  await test.step("a dica some da home do paciente", async () => {
    const titulos = await recarregarHome(paciente);
    expect(titulos.some((item) => item.includes(marca))).toBe(false);
    await expect(paciente.getByText(marca)).toHaveCount(0);
  });
});

test("orientação com imagem aparece só para o paciente da classificação escolhida", async ({
  page: admin,
  request,
  novaPagina,
  marcaDoConteudo: marca,
}) => {
  test.setTimeout(120_000);
  const titulo = `Orientação E2E ${marca}`;
  const descricao = `Descrição da orientação ${marca}`;
  const paginaPacienteA = await novaPagina();
  const paginaPacienteB = await novaPagina();

  const dadosPacienteA = await test.step("paciente A tem um diagnóstico classificado", async () => {
    const email = await criarPacienteLogado(paginaPacienteA, request);
    const headers = await tokenDe({ request, email });
    return criarDiagnostico({ request, headers });
  });

  const dadosPacienteB =
    await test.step("paciente B tem um diagnóstico de outra classificação", async () => {
      const email = await criarPacienteLogado(paginaPacienteB, request);
      const headers = await tokenDe({ request, email });
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const diagnostico = await criarDiagnostico({ request, headers });
        if (diagnostico.classificacao.id !== dadosPacienteA.classificacao.id) return diagnostico;
      }
      throw new Error("Não foi possível obter um diagnóstico de outra classificação");
    });

  await test.step("admin publica uma orientação com imagem para a classificação do paciente A", async () => {
    await admin.goto("/login");
    await entrar({ page: admin, email: EMAIL_ADMIN });
    await expect(admin).toHaveURL("/admin");
    await admin.goto("/admin/dicas/novo");
    await admin.getByLabel("Título").fill(titulo);
    await admin.getByLabel("Categoria").selectOption("higiene");
    await admin.getByRole("button", { name: "Imagem", exact: true }).click();
    await admin.locator("#conteudo-arquivo").setInputFiles({
      name: "lingua.png",
      mimeType: "image/png",
      buffer: imagemLingua,
    });
    await imagemCarregada(admin.getByAltText("Prévia da imagem enviada"));
    await admin.getByLabel("Descrição").fill(descricao);
    await admin.getByLabel("Orientações do diagnóstico").check();
    await admin.getByRole("checkbox", { name: dadosPacienteA.classificacao.nome_exibicao }).click();
    await admin.getByRole("button", { name: "Publicar" }).click();
    await expect(admin).toHaveURL("/admin/dicas?aviso=publicado");
    await expect(admin.getByText("Conteúdo publicado.")).toBeVisible();
  });

  await test.step("paciente A vê a orientação com a imagem carregada", async () => {
    const titulos = await abrirOrientacoes(paginaPacienteA, dadosPacienteA.id);
    expect(titulos).toContain(titulo);
    const card = paginaPacienteA.getByRole("button", { name: new RegExp(titulo) });
    await expect(card).toBeVisible();
    await expect(card).toContainText(descricao);
    await imagemCarregada(card.locator("img"));
  });

  await test.step("a orientação não aparece na home do paciente A", async () => {
    const titulos = await recarregarHome(paginaPacienteA);
    expect(titulos).not.toContain(titulo);
    await expect(paginaPacienteA.getByText(titulo, { exact: true })).toHaveCount(0);
  });

  await test.step("paciente B, de outra classificação, não vê a orientação", async () => {
    const titulos = await abrirOrientacoes(paginaPacienteB, dadosPacienteB.id);
    expect(titulos).not.toContain(titulo);
    await expect(paginaPacienteB.getByText(titulo, { exact: true })).toHaveCount(0);
  });
});
