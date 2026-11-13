import { expect, test } from "@playwright/test";
import { entrar, tokenDe } from "../helpers/auth";
import { criarDiagnostico } from "../helpers/diagnosticos";

test("revisão profissional corrigida chega ao paciente sem perder o resultado da IA", async ({
  page,
  browser,
  request,
}) => {
  const headers = await tokenDe({ request, email: "carla.mendes@example.com" });
  const { id, ordemIA } = await criarDiagnostico({
    request,
    headers,
    statusEsperado: "aguardando_revisao",
  });
  await page.goto("/login");
  await entrar({ page, email: "ana.souza@hality.com" });
  await expect(page).toHaveURL("/profissional");
  await page.goto(`/profissional/diagnosticos/${id}`);
  await expect(page.getByText("Sua avaliação")).toBeVisible();
  const leituraIA = page.getByText("Resultado da IA", { exact: true });
  await expect(leituraIA).toBeVisible();
  const botoes = page.getByRole("button", { name: /^[123] — / });
  const nomes = ["Hálito Normal", "Halitose Íntima", "Mau Hálito Social"];
  const indice = ordemIA - 1;
  expect(nomes[indice]).toBeDefined();
  const corrigido = (indice + 1) % nomes.length;
  const nomeCorrigido = nomes[corrigido];
  if (!nomeCorrigido) throw new Error("Classificação corrigida inválida");
  await botoes.nth(corrigido).click();
  await page
    .getByLabel("Observações clínicas")
    .fill("Observação clínica sintética para acompanhamento.");
  await page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Revisão salva" })).toBeVisible();
  await expect(page.getByTitle("Classificação original da IA, antes da revisão")).toContainText(
    `IA: ${nomes[indice]}`,
  );
  const contextoPaciente = await browser.newContext();
  try {
    const paciente = await contextoPaciente.newPage();
    await paciente.goto("/login");
    await entrar({ page: paciente, email: "carla.mendes@example.com" });
    await expect(paciente).toHaveURL("/paciente");
    await paciente.goto(`/paciente/diagnosticos/${id}`);
    await expect(paciente.getByText("Resultado revisado")).toBeVisible();
    await expect(
      paciente.getByText("Observação clínica sintética para acompanhamento."),
    ).toBeVisible();
    await expect(paciente.getByText("Ajustado na revisão")).toBeVisible();
    await expect(paciente.getByText(/Revisado por Dra\. Ana Souza/)).toBeVisible();
    await expect(paciente.getByText(nomeCorrigido, { exact: true }).first()).toBeVisible();
  } finally {
    await contextoPaciente.close();
  }
});
