import { expect, test, type Page } from "@playwright/test";
import { entrar, tokenDe } from "../helpers/auth";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import {
  ajustarDiagnostico,
  criarProfissionalDireto,
  criarUsuarios,
  diaIsolado,
  exigir,
  idPorEmail,
  revisarComOCodigoDaIa,
  rolarLista,
  tokenDeLista,
  vincular,
} from "./preparacao";

const NOMES_DO_SEED = ["Carla Mendes", "Diego Fontana", "Elisa Prado", "Nina Sem Histórico"];
const ROTULO_NIVEL = { 1: /Normal/, 2: /Íntima/, 3: /Social/ } as const;

function linkDo(page: Page, nome: string) {
  return page.locator("div.overflow-y-auto").getByRole("link", { name: nome });
}

function esperarDiagnosticos(page: Page, filtro: (url: URL) => boolean) {
  return page.waitForResponse((response) => {
    if (!response.ok() || response.request().method() !== "GET") return false;
    const url = new URL(response.url());
    if (url.pathname !== "/api/v1/admin/diagnosticos") return false;
    if (url.searchParams.get("limite") === "1") return false;
    return filtro(url);
  });
}

function esperarUsuarios(page: Page, filtro: (url: URL) => boolean) {
  return page.waitForResponse((response) => {
    if (!response.ok() || response.request().method() !== "GET") return false;
    const url = new URL(response.url());
    if (url.pathname !== "/api/v1/admin/usuarios") return false;
    return filtro(url);
  });
}

async function entrarNoAdmin(page: Page) {
  await page.goto("/login");
  await entrar({ page, email: "admin@hality.com" });
  await expect(page).toHaveURL("/admin");
}

async function aplicarPeriodo(page: Page, iso: string, rotulo: string) {
  const lista = esperarDiagnosticos(
    page,
    (url) => url.searchParams.get("data_inicio")?.startsWith(iso) === true,
  );
  await page.getByRole("button", { name: "Outro período" }).click();
  const dialog = page.getByRole("dialog");
  const datas = dialog.locator('input[type="date"]');
  await datas.nth(0).fill(iso);
  await datas.nth(1).fill(iso);
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  await lista;
  await expect(page.getByRole("button", { name: rotulo, exact: true })).toBeVisible();
}

test("filtros de diagnósticos isolam status, classificação da IA, sem classificação e período", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const token = tokenDeLista();
  const dia = diaIsolado();
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const classes = [];
  for (const indice of [1, 2, 3]) {
    const nome = `Classe ${indice} ${token}`;
    const email = `classe-${indice}-${token}@example.com`;
    await criarPacienteConfirmado({ request, page, nome, email });
    const headers = await tokenDe({ request, email });
    const criado = await criarDiagnostico({
      request,
      headers,
      statusEsperado: "aguardando_revisao",
    });
    classes.push({ nome, email, ...criado });
  }
  const ordens = new Set(classes.map((item) => item.ordemIA));
  expect(ordens).toEqual(new Set([1, 2, 3]));
  const revisado = exigir(classes[0], "diagnóstico para revisar");
  const pendenteA = exigir(classes[1], "primeiro pendente");
  const pendenteB = exigir(classes[2], "segundo pendente");
  const profissionalEmail = `prof-${token}@example.com`;
  const profissional = await criarProfissionalDireto({
    request,
    headers: admin,
    nome: `Prof ${token}`,
    email: profissionalEmail,
  });
  await vincular({
    request,
    headers: admin,
    pacienteId: await idPorEmail({ request, headers: admin, email: revisado.email }),
    profissionalId: profissional.id,
  });
  await revisarComOCodigoDaIa({
    request,
    email: profissionalEmail,
    diagnosticoId: revisado.id,
    codigo: revisado.classificacao.codigo,
  });

  const falhaNome = `Falha ${token}`;
  const falhaEmail = `falha-${token}@example.com`;
  await criarPacienteConfirmado({ request, page, nome: falhaNome, email: falhaEmail });
  const falha = await criarDiagnostico({
    request,
    headers: await tokenDe({ request, email: falhaEmail }),
    statusEsperado: "aguardando_revisao",
  });
  const processandoNome = `Processando ${token}`;
  const processandoEmail = `proc-${token}@example.com`;
  await criarPacienteConfirmado({
    request,
    page,
    nome: processandoNome,
    email: processandoEmail,
  });
  const processando = await criarDiagnostico({
    request,
    headers: await tokenDe({ request, email: processandoEmail }),
    statusEsperado: "aguardando_revisao",
  });
  const recenteNome = `Recente ${token}`;
  const recenteEmail = `recente-${token}@example.com`;
  await criarPacienteConfirmado({ request, page, nome: recenteNome, email: recenteEmail });
  await criarDiagnostico({
    request,
    headers: await tokenDe({ request, email: recenteEmail }),
    statusEsperado: "aguardando_revisao",
  });
  for (const item of [revisado, pendenteA, pendenteB]) {
    ajustarDiagnostico({ id: item.id, instante: dia.instante });
  }
  ajustarDiagnostico({ id: falha.id, instante: dia.instante, status: "falha" });
  ajustarDiagnostico({ id: processando.id, instante: dia.instante, status: "processando" });

  await test.step("Login do admin abre a lista de diagnósticos", async () => {
    await entrarNoAdmin(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Diagnósticos", exact: true })
      .click();
    await expect(page).toHaveURL("/admin/diagnosticos");
    await expect(page.getByRole("heading", { name: "Diagnósticos", exact: true })).toBeVisible();
  });

  await test.step("O período Todos mostra o diagnóstico recém-criado", async () => {
    await expect(linkDo(page, recenteNome)).toBeVisible();
  });

  await test.step("Os últimos 7 dias escondem a janela antiga e mantêm o recente", async () => {
    const lista = esperarDiagnosticos(page, (url) => url.searchParams.has("data_inicio"));
    await page.getByRole("button", { name: "7 dias", exact: true }).click();
    await lista;
    await expect(linkDo(page, recenteNome)).toBeVisible();
    await expect(linkDo(page, falhaNome)).toHaveCount(0);
    await expect(linkDo(page, processandoNome)).toHaveCount(0);
    await expect(linkDo(page, revisado.nome)).toHaveCount(0);
  });

  await test.step("O período personalizado isola os cinco diagnósticos do teste", async () => {
    await aplicarPeriodo(page, dia.iso, dia.rotulo);
    await expect(page.getByText("5 diagnósticos · 2 aguardando revisão")).toBeVisible();
    await expect(linkDo(page, recenteNome)).toHaveCount(0);
    for (const nome of [
      falhaNome,
      processandoNome,
      revisado.nome,
      pendenteA.nome,
      pendenteB.nome,
    ]) {
      await expect(linkDo(page, nome)).toBeVisible();
    }
    for (const nome of NOMES_DO_SEED) {
      await expect(page.getByText(nome, { exact: true })).toHaveCount(0);
    }
  });

  await test.step("Cada status mostra só os cards daquele estado", async () => {
    const aguardando = esperarDiagnosticos(
      page,
      (url) => url.searchParams.get("status") === "aguardando_revisao",
    );
    await page.getByRole("button", { name: "Aguardando revisão", exact: true }).click();
    await aguardando;
    await expect(linkDo(page, pendenteA.nome)).toBeVisible();
    await expect(linkDo(page, pendenteB.nome)).toBeVisible();
    await expect(linkDo(page, revisado.nome)).toHaveCount(0);
    await expect(linkDo(page, falhaNome)).toHaveCount(0);

    const revisados = esperarDiagnosticos(
      page,
      (url) => url.searchParams.get("status") === "concluido",
    );
    await page.getByRole("button", { name: "Revisado", exact: true }).click();
    await revisados;
    await expect(linkDo(page, revisado.nome).getByText("Revisado", { exact: true })).toBeVisible();
    await expect(linkDo(page, pendenteA.nome)).toHaveCount(0);

    const falhas = esperarDiagnosticos(page, (url) => url.searchParams.get("status") === "falha");
    await page.getByRole("button", { name: "Falha", exact: true }).click();
    await falhas;
    await expect(
      linkDo(page, falhaNome).getByText("Falha na análise", { exact: true }),
    ).toBeVisible();
    await expect(linkDo(page, revisado.nome)).toHaveCount(0);

    const processandoLista = esperarDiagnosticos(
      page,
      (url) => url.searchParams.get("status") === "processando",
    );
    await page.getByRole("button", { name: "Processando", exact: true }).click();
    await processandoLista;
    await expect(
      linkDo(page, processandoNome).getByText("Processando", { exact: true }),
    ).toBeVisible();
    await expect(linkDo(page, falhaNome)).toHaveCount(0);
  });

  await test.step("A classificação da IA filtra a lista e pode ser limpa", async () => {
    const todos = esperarDiagnosticos(page, (url) => !url.searchParams.has("status"));
    await page.getByRole("button", { name: "Todos", exact: true }).first().click();
    await todos;
    for (const item of [revisado, pendenteA, pendenteB]) {
      const ordem = item.ordemIA;
      if (ordem !== 1 && ordem !== 2 && ordem !== 3) throw new Error(`ordem inválida: ${ordem}`);
      const botao = page.getByRole("button", { name: ROTULO_NIVEL[ordem] });
      const lista = esperarDiagnosticos(
        page,
        (url) => url.searchParams.get("classificacao") === item.classificacao.codigo,
      );
      await botao.click();
      await lista;
      await expect(botao).toHaveAttribute("aria-pressed", "true");
      await expect(linkDo(page, item.nome)).toBeVisible();
      const outro = item.id === pendenteA.id ? pendenteB : pendenteA;
      if (outro.ordemIA !== ordem) await expect(linkDo(page, outro.nome)).toHaveCount(0);
      await botao.click();
      await expect(botao).toHaveAttribute("aria-pressed", "false");
    }
  });

  await test.step("Sem classificação mostra falha e processando, e o nível limpa esse filtro", async () => {
    const semClasse = esperarDiagnosticos(
      page,
      (url) => url.searchParams.get("sem_classificacao") === "true",
    );
    const botao = page.getByRole("button", { name: /Sem classificação/ });
    await botao.click();
    await semClasse;
    await expect(botao).toHaveAttribute("aria-pressed", "true");
    await expect(linkDo(page, falhaNome).getByLabel("Sem classificação")).toBeVisible();
    await expect(linkDo(page, processandoNome).getByLabel("Sem classificação")).toBeVisible();
    await expect(linkDo(page, revisado.nome)).toHaveCount(0);
    const nivel = page.getByRole("button", { name: ROTULO_NIVEL[1] });
    await nivel.click();
    await expect(botao).toHaveAttribute("aria-pressed", "false");
    await expect(nivel).toHaveAttribute("aria-pressed", "true");
    await nivel.click();
  });

  await test.step("Status e classificação juntos respeitam a interseção", async () => {
    const ordem = pendenteA.ordemIA;
    if (ordem !== 1 && ordem !== 2 && ordem !== 3) throw new Error(`ordem inválida: ${ordem}`);
    const lista = esperarDiagnosticos(
      page,
      (url) =>
        url.searchParams.get("status") === "aguardando_revisao" &&
        url.searchParams.get("classificacao") === pendenteA.classificacao.codigo,
    );
    await page.getByRole("button", { name: "Aguardando revisão", exact: true }).click();
    await page.getByRole("button", { name: ROTULO_NIVEL[ordem] }).click();
    await lista;
    await expect(linkDo(page, pendenteA.nome)).toBeVisible();
    if (pendenteB.ordemIA !== ordem) await expect(linkDo(page, pendenteB.nome)).toHaveCount(0);
    await expect(linkDo(page, revisado.nome)).toHaveCount(0);

    const vazio = esperarDiagnosticos(
      page,
      (url) =>
        url.searchParams.get("status") === "concluido" &&
        url.searchParams.get("classificacao") === pendenteA.classificacao.codigo,
    );
    await page.getByRole("button", { name: "Revisado", exact: true }).click();
    await vazio;
    if (revisado.ordemIA !== ordem) {
      await expect(page.getByText("Nenhum resultado", { exact: true })).toBeVisible();
      await expect(linkDo(page, revisado.nome)).toHaveCount(0);
    }
  });
});

test("paginação de diagnósticos não duplica e recupera a página seguinte após falha", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const token = tokenDeLista();
  const dia = diaIsolado();
  const nome = `Paginado ${token}`;
  const email = `paginado-${token}@example.com`;
  await criarPacienteConfirmado({ request, page, nome, email });
  const headers = await tokenDe({ request, email });
  const ids: number[] = [];
  for (let indice = 0; indice < 21; indice += 1) {
    const criado = await criarDiagnostico({
      request,
      headers,
      statusEsperado: "aguardando_revisao",
    });
    ids.push(criado.id);
    ajustarDiagnostico({ id: criado.id, instante: dia.instante });
  }
  const menor = exigir([...ids].sort((a, b) => a - b)[0], "id da segunda página");
  const maior = exigir([...ids].sort((a, b) => b - a)[0], "id da primeira página");

  await test.step("A primeira página da janela traz 20 diagnósticos, sem o mais antigo", async () => {
    await entrarNoAdmin(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Diagnósticos", exact: true })
      .click();
    await aplicarPeriodo(page, dia.iso, dia.rotulo);
    await expect(page.getByText("21 diagnósticos · 21 aguardando revisão")).toBeVisible();
    await expect(page.getByText(new RegExp(`#${maior}(?!\\d)`))).toBeVisible();
    await expect(page.getByText(new RegExp(`#${menor}(?!\\d)`))).toHaveCount(0);
  });

  await test.step("Rolar carrega o diagnóstico que faltava, sem duplicar os primeiros", async () => {
    await rolarLista(page);
    for (const id of ids) {
      await expect(page.getByText(new RegExp(`#${id}(?!\\d)`))).toHaveCount(1);
    }
  });

  await test.step("Falha na página seguinte mantém os 20 e o botão tenta de novo", async () => {
    await page.route("**/api/v1/admin/diagnosticos**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("pagina") === "2") {
        await route.fulfill({ status: 500, body: "" });
        return;
      }
      await route.continue();
    });
    await page.reload();
    await aplicarPeriodo(page, dia.iso, dia.rotulo);
    await expect(page.getByText(new RegExp(`#${maior}(?!\\d)`))).toBeVisible();
    await rolarLista(page);
    await expect(
      page.getByRole("button", { name: "Tentar carregar mais", exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(new RegExp(`#${menor}(?!\\d)`))).toHaveCount(0);
    await expect(page.getByText(new RegExp(`#${maior}(?!\\d)`))).toBeVisible();
    await page.unroute("**/api/v1/admin/diagnosticos**");
    await page.getByRole("button", { name: "Tentar carregar mais", exact: true }).click();
    for (const id of ids) {
      await expect(page.getByText(new RegExp(`#${id}(?!\\d)`))).toHaveCount(1);
    }
  });
});

test("busca e filtro por papel isolam os usuários do teste", async ({ page, request }) => {
  test.setTimeout(60_000);
  const token = tokenDeLista();
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const paciente = { nome: `Busca Paciente ${token}`, email: `paciente-${token}@example.com` };
  const profissional = {
    nome: `Busca Profissional ${token}`,
    email: `profissional-${token}@example.com`,
  };
  await criarUsuarios({
    request,
    headers: admin,
    usuarios: [
      { ...paciente, role: "paciente" },
      { ...profissional, role: "profissional" },
    ],
  });

  await test.step("A busca pelo e-mail mostra só aquele usuário", async () => {
    await entrarNoAdmin(page);
    await page.getByRole("navigation").getByRole("link", { name: "Usuários", exact: true }).click();
    await expect(page).toHaveURL("/admin/usuarios");
    const lista = esperarUsuarios(page, (url) => url.searchParams.get("busca") === paciente.email);
    await page.getByLabel("Buscar usuário").fill(paciente.email);
    await lista;
    await expect(page.getByText("1 usuário", { exact: true })).toBeVisible();
    await expect(linkDo(page, paciente.nome)).toBeVisible();
    await expect(linkDo(page, profissional.nome)).toHaveCount(0);
  });

  await test.step("A busca pelo token mostra os dois usuários do teste", async () => {
    const lista = esperarUsuarios(page, (url) => url.searchParams.get("busca") === token);
    await page.getByLabel("Buscar usuário").fill(token);
    await lista;
    await expect(page.getByText("2 usuários", { exact: true })).toBeVisible();
    await expect(linkDo(page, paciente.nome)).toBeVisible();
    await expect(linkDo(page, profissional.nome)).toBeVisible();
  });

  await test.step("O papel restringe a busca e Admins fica vazio", async () => {
    const profissionais = esperarUsuarios(
      page,
      (url) => url.searchParams.get("role") === "profissional",
    );
    await page.getByRole("button", { name: "Profissionais", exact: true }).click();
    await profissionais;
    await expect(linkDo(page, profissional.nome)).toBeVisible();
    await expect(linkDo(page, paciente.nome)).toHaveCount(0);

    const pacientes = esperarUsuarios(page, (url) => url.searchParams.get("role") === "paciente");
    await page.getByRole("button", { name: "Pacientes", exact: true }).click();
    await pacientes;
    await expect(linkDo(page, paciente.nome)).toBeVisible();
    await expect(linkDo(page, profissional.nome)).toHaveCount(0);

    const admins = esperarUsuarios(page, (url) => url.searchParams.get("role") === "admin");
    await page.getByRole("button", { name: "Admins", exact: true }).click();
    await admins;
    await expect(page.getByText("Nenhum usuário encontrado", { exact: true })).toBeVisible();
  });

  await test.step("A busca pelo admin do seed não traz os usuários do teste", async () => {
    const lista = esperarUsuarios(
      page,
      (url) => url.searchParams.get("busca") === "admin@hality.com",
    );
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await page.getByLabel("Buscar usuário").fill("admin@hality.com");
    await lista;
    await expect(linkDo(page, "Admin Hality")).toBeVisible();
    await expect(linkDo(page, paciente.nome)).toHaveCount(0);
    await expect(linkDo(page, profissional.nome)).toHaveCount(0);
  });
});

test("paginação de usuários não duplica e recupera a página seguinte após falha", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const token = tokenDeLista();
  const admin = await tokenDe({ request, email: "admin@hality.com" });
  const nomes = Array.from({ length: 22 }, (_, indice) => {
    const numero = String(indice + 1).padStart(2, "0");
    return `${token} ${numero}`;
  });
  await criarUsuarios({
    request,
    headers: admin,
    usuarios: nomes.map((nome, indice) => ({
      nome,
      email: `${token}-${String(indice + 1).padStart(2, "0")}@example.com`,
      role: indice === 21 ? "profissional" : "paciente",
    })),
  });
  const primeiro = exigir(nomes[0], "primeiro usuário");
  const penultimo = exigir(nomes[20], "usuário da segunda página");
  const ultimo = exigir(nomes[21], "último usuário");

  await test.step("A busca mostra o total e só a primeira página", async () => {
    await entrarNoAdmin(page);
    await page.getByRole("navigation").getByRole("link", { name: "Usuários", exact: true }).click();
    const lista = esperarUsuarios(page, (url) => url.searchParams.get("busca") === token);
    await page.getByLabel("Buscar usuário").fill(token);
    await lista;
    await expect(page.getByText("22 usuários", { exact: true })).toBeVisible();
    await expect(linkDo(page, primeiro)).toBeVisible();
    await expect(linkDo(page, penultimo)).toHaveCount(0);
    await expect(linkDo(page, ultimo)).toHaveCount(0);
  });

  await test.step("Rolar carrega o restante sem duplicar", async () => {
    await rolarLista(page);
    for (const nome of nomes) await expect(linkDo(page, nome)).toHaveCount(1);
  });

  await test.step("Falha na página seguinte mantém os 20 e o botão tenta de novo", async () => {
    await page.route("**/api/v1/admin/usuarios**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("pagina") === "2") {
        await route.fulfill({ status: 500, body: "" });
        return;
      }
      await route.continue();
    });
    await page.reload();
    const lista = esperarUsuarios(page, (url) => url.searchParams.get("busca") === token);
    await page.getByLabel("Buscar usuário").fill(token);
    await lista;
    await rolarLista(page);
    await expect(
      page.getByRole("button", { name: "Tentar carregar mais", exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(linkDo(page, primeiro)).toBeVisible();
    await expect(linkDo(page, penultimo)).toHaveCount(0);
    await page.unroute("**/api/v1/admin/usuarios**");
    await page.getByRole("button", { name: "Tentar carregar mais", exact: true }).click();
    for (const nome of nomes) await expect(linkDo(page, nome)).toHaveCount(1);
    await expect(page.getByText("22 usuários", { exact: true })).toBeVisible();
  });
});
