import { expect, type Page } from "@playwright/test";
import { z } from "zod";
import { backendPerguntaSchema } from "../../src/types/anamnese";

const perguntaSchema = backendPerguntaSchema
  .pick({
    id: true,
    enunciado: true,
    tipo: true,
    obrigatoria: true,
    opcoes: true,
    escala_min: true,
  })
  .required({ opcoes: true, escala_min: true });

export const questionarioSchema = z.object({
  versao: z.string().min(1),
  perguntas: z.array(perguntaSchema).min(1),
});
export type Pergunta = z.infer<typeof questionarioSchema>["perguntas"][number];

/** Responde uma pergunta sem alterar os valores e validações escolhidos pelo cenário. */
export async function responderPergunta({
  page,
  pergunta,
  editar = false,
  respostaBooleana = !editar,
  respostaEscala = (pergunta.escala_min ?? 1) + (editar ? 1 : 0),
  verificarValidacoes = true,
}: {
  page: Page;
  pergunta: Pergunta;
  editar?: boolean;
  respostaBooleana?: boolean;
  respostaEscala?: number;
  verificarValidacoes?: boolean;
}) {
  await expect(page.getByText(pergunta.enunciado, { exact: true })).toBeVisible();
  if (verificarValidacoes && pergunta.obrigatoria)
    await expect(page.getByText("Obrigatória", { exact: true })).toBeVisible();
  switch (pergunta.tipo) {
    case "boolean":
      await page
        .getByRole("button", { name: respostaBooleana ? "Sim" : "Não", exact: true })
        .click();
      break;
    case "single_choice": {
      const opcoes = pergunta.opcoes ?? [];
      if (verificarValidacoes) expect(opcoes.length).toBeGreaterThan(editar ? 1 : 0);
      const opcao = opcoes[editar ? 1 : 0];
      if (opcao === undefined) throw new Error("Pergunta sem a opção de resposta solicitada");
      await page.getByRole("button", { name: opcao, exact: true }).click();
      break;
    }
    case "text":
      if (verificarValidacoes && pergunta.obrigatoria && !editar)
        await expect(page.getByRole("button", { name: "Próximo" })).toBeDisabled();
      await page
        .getByPlaceholder("Digite sua resposta...")
        .fill(editar ? "Resposta editada" : "Resposta de teste");
      await page.getByRole("button", { name: "Próximo" }).click();
      break;
    case "scale":
      if (verificarValidacoes && pergunta.obrigatoria && !editar)
        await expect(page.getByRole("button", { name: "Próximo" })).toBeDisabled();
      await page.getByRole("button", { name: String(respostaEscala), exact: true }).click();
      await page.getByRole("button", { name: "Próximo" }).click();
      break;
    default: {
      const _exhaustive: never = pergunta.tipo;
      throw new Error(`Tipo de pergunta não suportado: ${_exhaustive}`);
    }
  }
}
