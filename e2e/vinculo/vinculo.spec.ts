import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";
import { questionarioSchema } from "../helpers/questionario";

const ADMIN = "admin@hality.com";
const ANA = "ana.souza@hality.com";
const FRASE_PRIVACIDADE =
  "As respostas da anamnese e as fotos não ficam visíveis para o administrador.";

const euSchema = z.object({ id: z.string().uuid() });
const vinculosSchema = z.object({ itens: z.array(z.object({ id: z.number() })) });
const detalheAdminSchema = z.object({
  anamnese_id: z.number(),
  qtd_imagens: z.number(),
  imagem: z.object({ disponivel: z.boolean() }),
});

let pacienteId = "";

async function prepararPaciente({
  request,
  page,
  prefixo,
}: {
  request: APIRequestContext;
  page: Page;
  prefixo: string;
}) {
  const sufixo = randomUUID();
  const email = `${prefixo}-${sufixo}@example.com`;
  const nome = `Paciente ${prefixo} ${sufixo.slice(0, 8)}`;
  await criarPacienteConfirmado({ request, page, nome, email });
  const headers = await tokenDe({ request, email });
  const eu = await request.get(`${API_URL}/users/me`, { headers });
  expect(eu.ok()).toBeTruthy();
  const { id } = euSchema.parse(await eu.json());
  const diagnostico = await criarDiagnostico({
    request,
    headers,
    statusEsperado: "aguardando_revisao",
  });
  const questionario = await request.get(`${API_URL}/anamneses/questionario`, { headers });
  expect(questionario.ok()).toBeTruthy();
  const enunciados = questionarioSchema
    .parse(await questionario.json())
    .perguntas.map((pergunta) => pergunta.enunciado);
  return { email, nome, id, diagnostico, enunciados };
}

async function encerrarVinculosDoPaciente(request: APIRequestContext, id: string) {
  const headers = await tokenDe({ request, email: ADMIN });
  const lista = await request.get(`${API_URL}/admin/vinculos?paciente_id=${id}&ativo=true`, {
    headers,
  });
  expect(lista.ok()).toBeTruthy();
  const { itens } = vinculosSchema.parse(await lista.json());
  for (const vinculo of itens) {
    const fim = await request.delete(`${API_URL}/admin/vinculos/${vinculo.id}`, { headers });
    expect([204, 404]).toContain(fim.status());
  }
}

function pedidoClinico(url: string) {
  return (
    url.includes("/api/v1/anamneses") ||
    url.includes("/api/v1/diagnosticos") ||
    url.includes("/imagens/") ||
    url.includes("assinatura=")
  );
}

test.describe("vínculo e privacidade", () => {
  test.afterEach(async ({ request }) => {
    if (!pacienteId) return;
    const id = pacienteId;
    pacienteId = "";
    await encerrarVinculosDoPaciente(request, id);
  });

  test("admin vincula e encerra o acesso da profissional sem apagar o histórico do paciente", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const paciente = await prepararPaciente({ request, page, prefixo: "vinculo" });
    pacienteId = paciente.id;
    const classificacao = paciente.diagnostico.classificacao.nome_exibicao;
    const adminContext = await browser.newContext();
    const profissionalContext = await browser.newContext();
    const admin = await adminContext.newPage();
    const profissional = await profissionalContext.newPage();

    try {
      await test.step("admin encontra o paciente e vincula a Dra. Ana Souza", async () => {
        await admin.goto("/login");
        await entrar({ page: admin, email: ADMIN });
        await expect(admin).toHaveURL("/admin");
        await admin.goto("/admin/usuarios");
        await admin.getByLabel("Buscar usuário").fill(paciente.email);
        await admin.getByText(paciente.email, { exact: true }).click();
        await expect(admin.getByText("Profissionais vinculados")).toBeVisible();
        await admin.getByRole("button", { name: "Vincular", exact: true }).click();
        const dialogo = admin.getByRole("dialog");
        await dialogo.getByLabel("Buscar profissional").fill(ANA);
        const ana = dialogo.getByRole("button", { name: "Dra. Ana Souza" });
        await expect(ana).toBeVisible();
        await expect(dialogo.getByRole("button", { name: "Dr. Bruno Lima" })).toHaveCount(0);
        await ana.click();
        await dialogo.getByRole("button", { name: "Vincular", exact: true }).click();
        await expect(
          admin.getByRole("button", { name: "Encerrar vínculo com Dra. Ana Souza" }),
        ).toBeVisible();
      });

      await test.step("profissional vê o paciente e o diagnóstico", async () => {
        await profissional.goto("/login");
        await entrar({ page: profissional, email: ANA });
        await expect(profissional).toHaveURL("/profissional");
        await profissional.goto("/profissional/pacientes");
        await profissional.getByPlaceholder("Buscar por nome ou e-mail...").fill(paciente.email);
        const card = profissional.locator("a", { hasText: paciente.email });
        await expect(card).toContainText(paciente.nome);
        await expect(card).toContainText("1 diagnósticos");
        await expect(card).toContainText(classificacao);
        await card.click();
        await expect(profissional).toHaveURL(`/profissional/pacientes/${paciente.id}`);
        const historico = profissional.getByRole("link", { name: new RegExp(classificacao) });
        await expect(historico).toContainText("Aguardando revisão");
        await historico.click();
        await expect(profissional.getByText("Sua avaliação", { exact: true })).toBeVisible();
        await expect(profissional.getByText(classificacao, { exact: true }).first()).toBeVisible();
        await expect(
          profissional.getByRole("img", { name: "Foto da língua capturada" }),
        ).toBeVisible();
      });

      await test.step("admin encerra o vínculo", async () => {
        await admin.getByRole("button", { name: "Encerrar vínculo com Dra. Ana Souza" }).click();
        const confirmacao = admin.getByRole("alertdialog");
        await expect(confirmacao).toContainText(paciente.nome);
        await confirmacao.getByRole("button", { name: "Encerrar vínculo", exact: true }).click();
        await expect(admin.getByText("Nenhum profissional vinculado.")).toBeVisible();
        await expect(
          admin.getByRole("button", { name: "Encerrar vínculo com Dra. Ana Souza" }),
        ).toHaveCount(0);
      });

      await test.step("profissional perde a lista, o detalhe e o acesso clínico", async () => {
        await profissional.goto("/profissional/pacientes");
        await profissional.getByPlaceholder("Buscar por nome ou e-mail...").fill(paciente.email);
        await expect(profissional.getByText("Nenhum paciente encontrado")).toBeVisible();
        await expect(profissional.getByText(paciente.nome)).toHaveCount(0);
        await profissional.goto(`/profissional/pacientes/${paciente.id}`);
        await expect(
          profissional.getByRole("alert").filter({ hasText: "Paciente não encontrado" }),
        ).toContainText("Ele pode não estar mais vinculado a você.");
        await expect(profissional.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0);
        await profissional.goto(`/profissional/diagnosticos/${paciente.diagnostico.id}`);
        await expect(
          profissional.getByRole("alert").filter({ hasText: "Diagnóstico indisponível" }),
        ).toContainText("Ele não existe ou é de um paciente que não está vinculado a você.");
        const headers = await tokenDe({ request, email: ANA });
        const leitura = await request.get(
          `${API_URL}/profissional/diagnosticos/${paciente.diagnostico.id}`,
          { headers },
        );
        expect(leitura.status()).toBe(404);
        const clinico = await request.get(`${API_URL}/diagnosticos/${paciente.diagnostico.id}`, {
          headers,
        });
        expect(clinico.status()).toBe(403);
        const revisao = await request.patch(
          `${API_URL}/profissional/diagnosticos/${paciente.diagnostico.id}/revisao`,
          {
            headers,
            data: {
              classificacao: paciente.diagnostico.classificacao.codigo,
              observacao: null,
              version: 0,
            },
          },
        );
        expect(revisao.status()).toBe(404);
      });
    } finally {
      await adminContext.close();
      await profissionalContext.close();
    }

    await test.step("paciente mantém o histórico", async () => {
      await page.goto("/login");
      await entrar({ page, email: paciente.email });
      await expect(page).toHaveURL("/paciente");
      await page.goto("/paciente/diagnosticos");
      await expect(page.getByRole("heading", { name: "Meus Diagnósticos" })).toBeVisible();
      const item = page.getByRole("link", { name: new RegExp(classificacao) });
      await expect(item).toBeVisible();
      await expect(page.getByText("1 exames realizados")).toBeVisible();
      await item.click();
      await expect(page.getByRole("img", { name: "Foto da língua capturada" })).toBeVisible();
      await page.reload();
      await expect(page.getByText(classificacao, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("img", { name: "Foto da língua capturada" })).toBeVisible();
    });
  });

  test("admin abre o diagnóstico sem buscar nem mostrar respostas ou foto", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const paciente = await prepararPaciente({ request, page, prefixo: "privacidade" });
    pacienteId = paciente.id;
    const classificacao = paciente.diagnostico.classificacao.nome_exibicao;

    await test.step("admin chega ao detalhe do diagnóstico", async () => {
      await page.goto("/login");
      await entrar({ page, email: ADMIN });
      await expect(page).toHaveURL("/admin");
      await page.goto("/admin/usuarios");
      await page.getByLabel("Buscar usuário").fill(paciente.email);
      await page.getByText(paciente.email, { exact: true }).click();
      await page.getByRole("link", { name: "Ver diagnósticos" }).click();
      await expect(
        page.getByRole("link", { name: `Diagnóstico #${paciente.diagnostico.id}` }),
      ).toBeVisible();
    });

    await test.step("o detalhe não pede nem mostra respostas ou foto", async () => {
      const pedidos: string[] = [];
      const registrar = (requisicao: { url: () => string }) => pedidos.push(requisicao.url());
      page.on("request", registrar);
      try {
        const detalhe = page.waitForResponse(
          (resposta) =>
            resposta.url() === `${API_URL}/admin/diagnosticos/${paciente.diagnostico.id}` &&
            resposta.request().method() === "GET",
        );
        await page.getByRole("link", { name: `Diagnóstico #${paciente.diagnostico.id}` }).click();
        const resposta = await detalhe;
        expect(resposta.ok()).toBeTruthy();
        const texto = await resposta.text();
        expect(texto).not.toContain("respostas");
        expect(texto).not.toContain("url_arquivo");
        expect(texto).not.toContain("assinatura");
        const corpo = detalheAdminSchema.parse(JSON.parse(texto));
        expect(corpo.imagem.disponivel).toBe(false);
        await expect(page.getByText(FRASE_PRIVACIDADE)).toBeVisible();
        await expect(page.getByText("Classificação da IA")).toBeVisible();
        await expect(page.getByText(classificacao, { exact: true })).toBeVisible();
        await expect(page.getByText("Aguardando revisão.")).toBeVisible();
        await expect(page.getByText(`#${corpo.anamnese_id}`, { exact: true })).toBeVisible();
        await expect(page.getByText("Imagens", { exact: true }).locator("..")).toContainText(
          String(corpo.qtd_imagens),
        );
        await expect(page.getByRole("img", { name: "Foto da língua capturada" })).toHaveCount(0);
        for (const enunciado of paciente.enunciados) {
          await expect(page.getByText(enunciado, { exact: true })).toHaveCount(0);
        }
        expect(pedidos.filter(pedidoClinico)).toEqual([]);
      } finally {
        page.off("request", registrar);
      }
    });
  });
});
