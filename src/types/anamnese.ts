import { z } from "zod";

/**
 * Data-driven pros dois fluxos (autodiagnóstico do paciente e avaliação
 * pelo profissional) — em Design/ só o paciente usava um array de
 * perguntas (ANAMNESE_QS); o profissional tinha 5 useState soltos
 * perguntando a mesma coisa na mão. Aqui os dois fluxos consomem a mesma
 * lista de PerguntaAnamnese.
 *
 * O conjunto de 10 perguntas fixas (RF09) é dado estático, não editável
 * pelo admin (essa variante foi riscada em requisitos.txt) — fica em
 * src/lib/anamnese-questions.ts, não aqui.
 */

export const tipoPerguntaSchema = z.enum(["sim_nao", "escolha", "texto", "escala"]);
export type TipoPergunta = z.infer<typeof tipoPerguntaSchema>;

export const perguntaAnamneseSchema = z.object({
  id: z.string(),
  texto: z.string(),
  tipo: tipoPerguntaSchema,
  opcoes: z.array(z.string()).optional(),
});
export type PerguntaAnamnese = z.infer<typeof perguntaAnamneseSchema>;

export const respostaAnamneseSchema = z.object({
  perguntaId: z.string(),
  valor: z.string(),
});
export type RespostaAnamnese = z.infer<typeof respostaAnamneseSchema>;

/**
 * Só `Diagnostico.anamneseId` aponta pra cá — não o contrário. A
 * anamnese é coletada antes do diagnóstico existir (RF08: formulário vem
 * antes da captura da imagem), então ela não pode nascer já apontando pra
 * um diagnóstico que ainda não foi criado.
 */
export const anamneseSchema = z.object({
  id: z.string(),
  respostas: z.array(respostaAnamneseSchema),
});
export type Anamnese = z.infer<typeof anamneseSchema>;
