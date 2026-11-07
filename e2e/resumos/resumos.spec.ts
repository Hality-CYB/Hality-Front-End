import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { z } from "zod";
import { backendResumoProfissionalSchema } from "../../src/types/profissional";
import { entrar, tokenDe } from "../helpers/auth";
import { API_URL } from "../helpers/config";
import { criarDiagnostico } from "../helpers/diagnosticos";
import { criarPacienteConfirmado } from "../helpers/pacientes";

const EMAIL_PROFISSIONAL = "ana.souza@hality.com";
const EMAIL_ADMIN = "admin@hality.com";

const vinculoSchema = z.object({ paciente_id: z.string() });

function contador(page: Page, rotulo: string): Locator {
  return page.getByText(rotulo, { exact: true }).locator("xpath=preceding-sibling::*[1]");
}

async function lerContadorNumerico(page: Page, rotulo: string) {
  const numero = contador(page, rotulo);
  await expect(numero).toHaveText(/^\d+$/);
  return Number(await numero.innerText());
}

async function prepararPacienteVinculado({
  request,
  page,
  headersProfissional,
}: {
  request: APIRequestContext;
  page: Page;
  headersProfissional: { Authorization: string };
}) {
  const { email } = await criarPacienteConfirmado({
    request,
    page,
    nome: `Paciente Resumo ${randomUUID().slice(0, 8)}`,
  });
  const vinculo = await request.post(`${API_URL}/vinculos`, {
    headers: headersProfissional,
    data: { paciente_email: email },
  });
  expect(vinculo.status(), await vinculo.text()).toBe(201);
  const { paciente_id: pacienteId } = vinculoSchema.parse(await vinculo.json());
  const headersPaciente = await tokenDe({ request, email });
  return { pacienteId, headersPaciente };
}

async function desvincularPaciente({
  request,
  headersProfissional,
  pacienteId,
}: {
  request: APIRequestContext;
  headersProfissional: { Authorization: string };
  pacienteId: string;
}) {
  const resposta = await request.delete(`${API_URL}/vinculos/${pacienteId}`, {
    headers: headersProfissional,
  });
  expect(resposta.status()).toBe(204);
}

async function revisarPelaTela({
  page,
  diagnosticoId,
  ordemIA,
}: {
  page: Page;
  diagnosticoId: number;
  ordemIA: number;
}) {
  await page.goto(`/profissional/diagnosticos/${diagnosticoId}?voltar=/profissional`);
  await page
    .getByRole("button", { name: /^[123] — / })
    .nth(ordemIA - 1)
    .click();
  await page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Revisão salva" })).toBeVisible();
}

test("resumo do profissional conta o diagnóstico novo e tira da fila de revisão depois de revisado", async ({
  page,
  request,
}) => {
  const headersProfissional = await tokenDe({ request, email: EMAIL_PROFISSIONAL });
  let pacienteId: string | undefined;
  try {
    const paciente = await test.step("Paciente próprio fica vinculado à profissional", () =>
      prepararPacienteVinculado({ request, page, headersProfissional }));
    pacienteId = paciente.pacienteId;

    const antes =
      await test.step("Profissional lê os contadores do resumo antes do diagnóstico", async () => {
        const resumoCarregado = page.waitForResponse((resposta) =>
          resposta.url().startsWith(`${API_URL}/profissional/resumo`),
        );
        await page.goto("/login");
        await entrar({ page, email: EMAIL_PROFISSIONAL });
        await expect(page).toHaveURL("/profissional");
        const resumo = backendResumoProfissionalSchema.parse(await (await resumoCarregado).json());
        await expect(contador(page, "diagnósticos")).toHaveText(String(resumo.diagnosticos_total));
        await expect(contador(page, "para revisar")).toHaveText(String(resumo.pendentes_revisao));
        await expect(contador(page, "pacientes")).toHaveText(String(resumo.pacientes_ativos));
        return {
          diagnosticos: resumo.diagnosticos_total,
          paraRevisar: resumo.pendentes_revisao,
          pacientes: resumo.pacientes_ativos,
        };
      });

    const diagnostico = await test.step("Paciente envia um diagnóstico novo", () =>
      criarDiagnostico({
        request,
        headers: paciente.headersPaciente,
        statusEsperado: "aguardando_revisao",
      }));

    await test.step("Resumo do profissional soma o diagnóstico novo na fila de revisão", async () => {
      await page.reload();
      await expect(contador(page, "diagnósticos")).toHaveText(String(antes.diagnosticos + 1));
      await expect(contador(page, "para revisar")).toHaveText(String(antes.paraRevisar + 1));
      await expect(contador(page, "pacientes")).toHaveText(String(antes.pacientes));
    });

    await test.step("Profissional revisa o diagnóstico", () =>
      revisarPelaTela({ page, diagnosticoId: diagnostico.id, ordemIA: diagnostico.ordemIA }));

    await test.step("Resumo do profissional tira o diagnóstico revisado da fila", async () => {
      await page.getByRole("link", { name: "Voltar" }).click();
      await expect(page).toHaveURL("/profissional");
      await expect(contador(page, "diagnósticos")).toHaveText(String(antes.diagnosticos + 1));
      await expect(contador(page, "para revisar")).toHaveText(String(antes.paraRevisar));
      await expect(contador(page, "pacientes")).toHaveText(String(antes.pacientes));
    });
  } finally {
    if (pacienteId) await desvincularPaciente({ request, headersProfissional, pacienteId });
  }
});

test("resumo do admin conta o diagnóstico novo e o move para revisados depois da revisão", async ({
  page,
  browser,
  request,
}) => {
  const headersProfissional = await tokenDe({ request, email: EMAIL_PROFISSIONAL });
  const contextoProfissional = await browser.newContext();
  let pacienteId: string | undefined;
  try {
    const paciente = await test.step("Paciente próprio fica vinculado à profissional", () =>
      prepararPacienteVinculado({ request, page, headersProfissional }));
    pacienteId = paciente.pacienteId;

    const antes =
      await test.step("Admin lê os contadores do resumo antes do diagnóstico", async () => {
        await page.goto("/login");
        await entrar({ page, email: EMAIL_ADMIN });
        await expect(page).toHaveURL("/admin");
        return {
          diagnosticos: await lerContadorNumerico(page, "diagnósticos em 30 dias"),
          aguardandoRevisao: await lerContadorNumerico(page, "aguardando revisão"),
          revisados: await lerContadorNumerico(page, "revisados em 30 dias"),
        };
      });

    const diagnostico = await test.step("Paciente envia um diagnóstico novo", () =>
      criarDiagnostico({
        request,
        headers: paciente.headersPaciente,
        statusEsperado: "aguardando_revisao",
      }));

    await test.step("Resumo do admin soma o diagnóstico novo aguardando revisão", async () => {
      await page.reload();
      await expect(contador(page, "diagnósticos em 30 dias")).toHaveText(
        String(antes.diagnosticos + 1),
      );
      await expect(contador(page, "aguardando revisão")).toHaveText(
        String(antes.aguardandoRevisao + 1),
      );
      await expect(contador(page, "revisados em 30 dias")).toHaveText(String(antes.revisados));
    });

    await test.step("Profissional revisa o diagnóstico", async () => {
      const paginaProfissional = await contextoProfissional.newPage();
      await paginaProfissional.goto("/login");
      await entrar({ page: paginaProfissional, email: EMAIL_PROFISSIONAL });
      await expect(paginaProfissional).toHaveURL("/profissional");
      await revisarPelaTela({
        page: paginaProfissional,
        diagnosticoId: diagnostico.id,
        ordemIA: diagnostico.ordemIA,
      });
    });

    await test.step("Resumo do admin move o diagnóstico para revisados", async () => {
      await page.reload();
      await expect(contador(page, "revisados em 30 dias")).toHaveText(String(antes.revisados + 1));
      await expect(contador(page, "aguardando revisão")).toHaveText(
        String(antes.aguardandoRevisao),
      );
      await expect(contador(page, "diagnósticos em 30 dias")).toHaveText(
        String(antes.diagnosticos + 1),
      );
    });
  } finally {
    await contextoProfissional.close();
    if (pacienteId) await desvincularPaciente({ request, headersProfissional, pacienteId });
  }
});
