import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { entrar, tokenDe } from "../helpers/auth";
import { consultarBanco } from "../helpers/banco";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const ANA = { email: "ana.souza@hality.com", nome: "Dra. Ana Souza" };
const BRUNO = { email: "bruno.lima@hality.com", nome: "Dr. Bruno Lima" };
const NIVEIS = ["Hálito Normal", "Halitose Íntima", "Mau Hálito Social"];
const AVISO_CONFLITO =
  "Outra revisão foi salva enquanto você editava. A tela foi atualizada; confira e salve de novo.";
const DETALHE_NAO_REVISAVEL = "diagnóstico não está disponível para revisão";

const revisaoSchema = z.object({
  version: z.number(),
  classificacao: z.object({ nome_exibicao: z.string() }),
  profissional_nome: z.string().nullable(),
  observacao: z.string().nullable(),
});
const diagnosticoProfissionalSchema = z.object({
  version: z.number(),
  revisao: revisaoSchema.nullable(),
  historico_revisoes: z.array(revisaoSchema),
});

type Profissional = typeof ANA;

async function lerDiagnosticoComo({
  request,
  profissional,
  id,
}: {
  request: APIRequestContext;
  profissional: Profissional;
  id: number;
}) {
  const headers = await tokenDe({ request, email: profissional.email });
  const resposta = await request.get(`${API_URL}/profissional/diagnosticos/${id}`, { headers });
  expect(resposta.ok()).toBeTruthy();
  return diagnosticoProfissionalSchema.parse(await resposta.json());
}

async function vincularPaciente({
  request,
  profissional,
  emailPaciente,
}: {
  request: APIRequestContext;
  profissional: Profissional;
  emailPaciente: string;
}) {
  const headers = await tokenDe({ request, email: profissional.email });
  const vinculo = await request.post(`${API_URL}/vinculos`, {
    headers,
    data: { paciente_email: emailPaciente },
  });
  expect(vinculo.status()).toBe(201);
}

async function prepararPacienteVinculado({
  request,
  page,
  profissionais,
}: {
  request: APIRequestContext;
  page: Page;
  profissionais: Profissional[];
}) {
  const paciente = await criarPacienteConfirmado({ request, page });
  for (const profissional of profissionais)
    await vincularPaciente({ request, profissional, emailPaciente: paciente.email });
  const headersPaciente = await tokenDe({ request, email: paciente.email });
  return { paciente, headersPaciente };
}

async function abrirDiagnosticoComo({
  page,
  profissional,
  id,
}: {
  page: Page;
  profissional: Profissional;
  id: number;
}) {
  await page.goto("/login");
  await entrar({ page, email: profissional.email });
  await expect(page).toHaveURL("/profissional");
  await page.goto(`/profissional/diagnosticos/${id}`);
  await expect(page.getByText("Sua avaliação")).toBeVisible();
}

function escolherClassificacao(page: Page, ordem: number) {
  return page.getByRole("button", { name: `${ordem} — ${NIVEIS[ordem - 1]}`, exact: true }).click();
}

function proximaOrdemDiferenteDe(ordens: number[]) {
  const ordem = [1, 2, 3].find((candidata) => !ordens.includes(candidata));
  if (ordem === undefined) throw new Error("Sem classificação diferente disponível");
  return ordem;
}

function alertaDeConflito(page: Page) {
  return page.getByRole("alert").filter({ hasText: AVISO_CONFLITO });
}

test.describe("revisão do profissional: histórico e concorrência", () => {
  test.setTimeout(90_000);

  test("segunda revisão do mesmo profissional fica salva e aparece no histórico", async ({
    page,
    browser,
    request,
  }) => {
    let id = 0;
    let ordemIA = 0;
    const primeiraObservacao = "Primeira revisão sintética";
    const segundaObservacao = "Segunda revisão sintética";

    await test.step("prepara paciente próprio com diagnóstico vinculado à Dra. Ana", async () => {
      const { headersPaciente } = await prepararPacienteVinculado({
        request,
        page,
        profissionais: [ANA],
      });
      const diagnostico = await criarDiagnostico({
        request,
        headers: headersPaciente,
        statusEsperado: "aguardando_revisao",
      });
      id = diagnostico.id;
      ordemIA = diagnostico.ordemIA;
    });
    const primeiraOrdem = proximaOrdemDiferenteDe([ordemIA]);
    const segundaOrdem = proximaOrdemDiferenteDe([ordemIA, primeiraOrdem]);

    await test.step("primeira revisão é salva", async () => {
      await abrirDiagnosticoComo({ page, profissional: ANA, id });
      await escolherClassificacao(page, primeiraOrdem);
      await page.getByLabel("Observações clínicas").fill(primeiraObservacao);
      await page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "Revisão salva" })).toBeVisible();
      await expect(page.getByText(`Revisado como ${NIVEIS[primeiraOrdem - 1]}`)).toBeVisible();
      await expect(page.getByRole("button", { name: "Salvar nova revisão" })).toBeVisible();
    });

    await test.step("segunda revisão substitui a atual e soma no histórico", async () => {
      await escolherClassificacao(page, segundaOrdem);
      await page.getByLabel("Observações clínicas").fill(segundaObservacao);
      await page.getByRole("button", { name: "Salvar nova revisão", exact: true }).click();
      await expect(page.getByText(`Revisado como ${NIVEIS[segundaOrdem - 1]}`)).toBeVisible();
      await expect(page.getByText(/2 revisões no histórico/)).toBeVisible();
      await expect(page.getByText(segundaObservacao, { exact: true })).toBeVisible();
    });

    await test.step("revisões continuam após recarregar a página", async () => {
      await page.reload();
      await expect(page.getByText(`Revisado como ${NIVEIS[segundaOrdem - 1]}`)).toBeVisible();
      await expect(page.getByText(/2 revisões no histórico/)).toBeVisible();
    });

    await test.step("API guarda as duas versões em ordem", async () => {
      const diagnostico = await lerDiagnosticoComo({ request, profissional: ANA, id });
      expect(diagnostico.version).toBe(2);
      expect(
        diagnostico.historico_revisoes.map((revisao) => ({
          classificacao: revisao.classificacao.nome_exibicao,
          profissional: revisao.profissional_nome,
          observacao: revisao.observacao,
        })),
      ).toEqual([
        {
          classificacao: NIVEIS[primeiraOrdem - 1],
          profissional: ANA.nome,
          observacao: primeiraObservacao,
        },
        {
          classificacao: NIVEIS[segundaOrdem - 1],
          profissional: ANA.nome,
          observacao: segundaObservacao,
        },
      ]);
    });

    await test.step("admin vê o histórico de revisões com a mais nova primeiro", async () => {
      const contextoAdmin = await browser.newContext();
      try {
        const admin = await contextoAdmin.newPage();
        await admin.goto("/login");
        await entrar({ page: admin, email: "admin@hality.com" });
        await expect(admin).toHaveURL("/admin");
        await admin.goto(`/admin/diagnosticos/${id}`);
        const historico = admin.getByRole("listitem").filter({ hasText: ANA.nome });
        await expect(historico).toHaveCount(2);
        await expect(historico.nth(0)).toContainText(segundaObservacao);
        await expect(historico.nth(0)).toContainText(NIVEIS[segundaOrdem - 1] ?? "");
        await expect(historico.nth(1)).toContainText(primeiraObservacao);
        await expect(historico.nth(1)).toContainText(NIVEIS[primeiraOrdem - 1] ?? "");
      } finally {
        await contextoAdmin.close();
      }
    });
  });

  test("profissional com versão velha recebe conflito, vê a revisão do colega e revisa de novo", async ({
    page,
    browser,
    request,
  }) => {
    let id = 0;
    let ordemIA = 0;
    const observacaoAna = "Revisão da Dra. Ana";
    const observacaoBruno = "Revisão do Dr. Bruno";
    const contextoBruno = await browser.newContext();
    try {
      const paginaBruno = await contextoBruno.newPage();

      await test.step("prepara paciente próprio vinculado à Dra. Ana e ao Dr. Bruno", async () => {
        const { headersPaciente } = await prepararPacienteVinculado({
          request,
          page,
          profissionais: [ANA, BRUNO],
        });
        const diagnostico = await criarDiagnostico({
          request,
          headers: headersPaciente,
          statusEsperado: "aguardando_revisao",
        });
        id = diagnostico.id;
        ordemIA = diagnostico.ordemIA;
      });
      const ordemAna = proximaOrdemDiferenteDe([ordemIA]);
      const ordemBruno = proximaOrdemDiferenteDe([ordemIA, ordemAna]);

      await test.step("os dois profissionais abrem o diagnóstico ainda sem revisão", async () => {
        await abrirDiagnosticoComo({ page, profissional: ANA, id });
        await abrirDiagnosticoComo({ page: paginaBruno, profissional: BRUNO, id });
        await expect(
          page.getByRole("button", { name: "Salvar revisão", exact: true }),
        ).toBeVisible();
        await expect(
          paginaBruno.getByRole("button", { name: "Salvar revisão", exact: true }),
        ).toBeVisible();
      });

      await test.step("Dra. Ana salva primeiro", async () => {
        await escolherClassificacao(page, ordemAna);
        await page.getByLabel("Observações clínicas").fill(observacaoAna);
        await page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
        await expect(page.getByRole("status").filter({ hasText: "Revisão salva" })).toBeVisible();
      });

      await test.step("Dr. Bruno salva com a versão velha e recebe conflito", async () => {
        await escolherClassificacao(paginaBruno, ordemBruno);
        await paginaBruno.getByLabel("Observações clínicas").fill(observacaoBruno);
        const [resposta] = await Promise.all([
          paginaBruno.waitForResponse(
            (candidata) =>
              candidata.url().endsWith(`/profissional/diagnosticos/${id}/revisao`) &&
              candidata.request().method() === "PATCH",
          ),
          paginaBruno.getByRole("button", { name: "Salvar revisão", exact: true }).click(),
        ]);
        expect(resposta.status()).toBe(409);
        await expect(alertaDeConflito(paginaBruno)).toBeVisible();
      });

      await test.step("tela do Dr. Bruno mostra a revisão da Dra. Ana sem recarregar", async () => {
        await expect(paginaBruno.getByText(`Revisado como ${NIVEIS[ordemAna - 1]}`)).toBeVisible();
        await expect(paginaBruno.getByText(ANA.nome, { exact: false }).first()).toBeVisible();
        await expect(paginaBruno.getByText(observacaoAna, { exact: true })).toBeVisible();
        await expect(
          paginaBruno.getByRole("button", { name: "Salvar nova revisão", exact: true }),
        ).toBeVisible();
      });

      await test.step("API não gravou a revisão recusada", async () => {
        const diagnostico = await lerDiagnosticoComo({ request, profissional: BRUNO, id });
        expect(diagnostico.historico_revisoes).toHaveLength(1);
        expect(diagnostico.revisao?.profissional_nome).toBe(ANA.nome);
        expect(diagnostico.revisao?.observacao).toBe(observacaoAna);
      });

      await test.step("Dr. Bruno revisa de novo e salva", async () => {
        await escolherClassificacao(paginaBruno, ordemBruno);
        await paginaBruno.getByLabel("Observações clínicas").fill(observacaoBruno);
        const [resposta] = await Promise.all([
          paginaBruno.waitForResponse(
            (candidata) =>
              candidata.url().endsWith(`/profissional/diagnosticos/${id}/revisao`) &&
              candidata.request().method() === "PATCH",
          ),
          paginaBruno.getByRole("button", { name: "Salvar nova revisão", exact: true }).click(),
        ]);
        expect(resposta.status()).toBe(200);
        await expect(
          paginaBruno.getByRole("status").filter({ hasText: "Revisão salva" }),
        ).toBeVisible();
        await expect(
          paginaBruno.getByText(`Revisado como ${NIVEIS[ordemBruno - 1]}`),
        ).toBeVisible();
        await expect(paginaBruno.getByText(/2 revisões no histórico/)).toBeVisible();
      });

      await test.step("Dra. Ana vê a revisão do colega após recarregar", async () => {
        await page.reload();
        await expect(page.getByText(`Revisado como ${NIVEIS[ordemBruno - 1]}`)).toBeVisible();
        await expect(page.getByText(BRUNO.nome, { exact: false }).first()).toBeVisible();
        await expect(page.getByText(/2 revisões no histórico/)).toBeVisible();
      });

      await test.step("histórico guarda as duas revisões, sem duplicar a recusada", async () => {
        const diagnostico = await lerDiagnosticoComo({ request, profissional: ANA, id });
        expect(
          diagnostico.historico_revisoes.map((revisao) => ({
            profissional: revisao.profissional_nome,
            classificacao: revisao.classificacao.nome_exibicao,
            observacao: revisao.observacao,
          })),
        ).toEqual([
          {
            profissional: ANA.nome,
            classificacao: NIVEIS[ordemAna - 1],
            observacao: observacaoAna,
          },
          {
            profissional: BRUNO.nome,
            classificacao: NIVEIS[ordemBruno - 1],
            observacao: observacaoBruno,
          },
        ]);
      });
    } finally {
      await contextoBruno.close();
    }
  });

  test("diagnóstico em processamento ou com falha não pode ser revisado", async ({
    page,
    request,
  }) => {
    const estados = [
      {
        titulo: "em processamento",
        selo: "Processando",
        aviso: "A IA ainda está analisando a imagem. A revisão fica disponível quando terminar.",
        preparar: (id: number) =>
          consultarBanco(
            `UPDATE diagnosticos SET status = 'processando', classificacao_id = NULL, escala_saburra = NULL, confianca_ia = NULL, origem_resultado = NULL, data_diagnostico = now() + interval '1 day' WHERE id = ${id}`,
          ),
      },
      {
        titulo: "com falha",
        selo: "Falha na análise",
        aviso: "A análise da imagem falhou, então não há classificação para revisar.",
        preparar: (id: number) =>
          consultarBanco(
            `UPDATE diagnosticos SET status = 'falha', classificacao_id = NULL, escala_saburra = NULL, confianca_ia = NULL, origem_resultado = NULL, erro_codigo = 'falha_processamento' WHERE id = ${id}`,
          ),
      },
    ];
    const diagnosticos: { id: number; ordemIA: number }[] = [];

    await test.step("prepara um diagnóstico próprio para cada estado, vinculado à Dra. Ana", async () => {
      const { headersPaciente } = await prepararPacienteVinculado({
        request,
        page,
        profissionais: [ANA],
      });
      for (const estado of estados) {
        const diagnostico = await criarDiagnostico({
          request,
          headers: headersPaciente,
          statusEsperado: "aguardando_revisao",
        });
        estado.preparar(diagnostico.id);
        diagnosticos.push(diagnostico);
      }
    });

    await page.goto("/login");
    await entrar({ page, email: ANA.email });
    await expect(page).toHaveURL("/profissional");
    const headersAna = await tokenDe({ request, email: ANA.email });

    for (const [indice, estado] of estados.entries()) {
      const diagnostico = diagnosticos[indice];
      if (!diagnostico) throw new Error("Diagnóstico de preparação ausente");

      await test.step(`diagnóstico ${estado.titulo} não oferece revisão na tela`, async () => {
        await page.goto(`/profissional/diagnosticos/${diagnostico.id}`);
        await expect(page.getByText("Sua avaliação")).toBeVisible();
        await expect(page.getByText(estado.selo, { exact: true }).first()).toBeVisible();
        await expect(page.getByText(estado.aviso, { exact: true })).toBeVisible();
        await expect(page.getByText("Classificação confirmada")).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^Salvar (nova )?revisão$/ })).toHaveCount(0);
      });

      await test.step(`API recusa revisão de diagnóstico ${estado.titulo}`, async () => {
        const antes = await lerDiagnosticoComo({ request, profissional: ANA, id: diagnostico.id });
        const resposta = await request.patch(
          `${API_URL}/profissional/diagnosticos/${diagnostico.id}/revisao`,
          {
            headers: headersAna,
            data: {
              classificacao: "halito_normal",
              observacao: null,
              version: antes.version,
            },
          },
        );
        expect(resposta.status()).toBe(409);
        expect(await resposta.json()).toEqual({ detail: DETALHE_NAO_REVISAVEL });
        const depois = await lerDiagnosticoComo({ request, profissional: ANA, id: diagnostico.id });
        expect(depois.revisao).toBeNull();
        expect(depois.historico_revisoes).toHaveLength(0);
      });
    }
  });
});
