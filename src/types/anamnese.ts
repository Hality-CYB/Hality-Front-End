import { z } from "zod";

/**
 * Data-driven pros dois fluxos (autodiagnóstico do paciente e avaliação
 * pelo profissional) — em Design/ só o paciente usava um array de
 * perguntas (ANAMNESE_QS); o profissional tinha 5 useState soltos
 * perguntando a mesma coisa na mão. Aqui os dois fluxos consomem a mesma
 * lista de PerguntaAnamnese.
 *
 * O questionário (RF09) não é mais estático no front: o back expõe o
 * catálogo vigente (com versão) em GET /anamneses/questionario e valida
 * a submissão contra ele — ver `backend*Schema`/`adaptBackend*` abaixo,
 * que reconciliam a nomenclatura do back (inglês, snake_case) com a do
 * front (português, camelCase), mesmo padrão de `adaptBackendUser` em
 * `types/usuario.ts`.
 */

export const tipoPerguntaSchema = z.enum(["sim_nao", "escolha", "texto", "escala"]);
export type TipoPergunta = z.infer<typeof tipoPerguntaSchema>;

export const backendTipoPerguntaSchema = z.enum(["boolean", "single_choice", "text", "scale"]);
export type BackendTipoPergunta = z.infer<typeof backendTipoPerguntaSchema>;

const TIPO_PERGUNTA_BACKEND_PARA_FRONT: Record<BackendTipoPergunta, TipoPergunta> = {
  boolean: "sim_nao",
  single_choice: "escolha",
  text: "texto",
  scale: "escala",
};

const TIPO_PERGUNTA_FRONT_PARA_BACKEND: Record<TipoPergunta, BackendTipoPergunta> = {
  sim_nao: "boolean",
  escolha: "single_choice",
  texto: "text",
  escala: "scale",
};

export function mapBackendTipoPergunta(tipo: BackendTipoPergunta): TipoPergunta {
  return TIPO_PERGUNTA_BACKEND_PARA_FRONT[tipo];
}

export function mapTipoPerguntaParaBackend(tipo: TipoPergunta): BackendTipoPergunta {
  return TIPO_PERGUNTA_FRONT_PARA_BACKEND[tipo];
}

export const perguntaAnamneseSchema = z.object({
  id: z.string(),
  texto: z.string(),
  tipo: tipoPerguntaSchema,
  obrigatoria: z.boolean(),
  opcoes: z.array(z.string()).optional(),
});
export type PerguntaAnamnese = z.infer<typeof perguntaAnamneseSchema>;

export const backendPerguntaSchema = z.object({
  id: z.string(),
  enunciado: z.string(),
  tipo: backendTipoPerguntaSchema,
  obrigatoria: z.boolean(),
  opcoes: z.array(z.string()).nullable().optional(),
  escala_min: z.number().nullable().optional(),
  escala_max: z.number().nullable().optional(),
  escala_label_min: z.string().nullable().optional(),
  escala_label_max: z.string().nullable().optional(),
});
export type BackendPergunta = z.infer<typeof backendPerguntaSchema>;

export function adaptBackendPergunta(data: BackendPergunta): PerguntaAnamnese {
  return {
    id: data.id,
    texto: data.enunciado,
    tipo: mapBackendTipoPergunta(data.tipo),
    obrigatoria: data.obrigatoria,
    opcoes: data.opcoes ?? undefined,
  };
}

export const questionarioAnamneseSchema = z.object({
  versao: z.string(),
  perguntas: z.array(perguntaAnamneseSchema),
});
export type QuestionarioAnamnese = z.infer<typeof questionarioAnamneseSchema>;

export const backendQuestionarioSchema = z.object({
  versao: z.string(),
  perguntas: z.array(backendPerguntaSchema),
});
export type BackendQuestionario = z.infer<typeof backendQuestionarioSchema>;

export function adaptBackendQuestionario(data: BackendQuestionario): QuestionarioAnamnese {
  return {
    versao: data.versao,
    perguntas: data.perguntas.map(adaptBackendPergunta),
  };
}

/**
 * `valor` sempre string no front (é como o wizard guarda as respostas em
 * memória, inclusive escala/sim-não) — a conversão pro tipo que o back
 * espera (bool/int/str) acontece em `anamnese-service.ts`, na hora de
 * montar o payload.
 */
export const respostaAnamneseSchema = z.object({
  perguntaId: z.string(),
  enunciado: z.string(),
  tipo: tipoPerguntaSchema,
  valor: z.string(),
});
export type RespostaAnamnese = z.infer<typeof respostaAnamneseSchema>;

export const backendRespostaItemSchema = z.object({
  pergunta_id: z.string(),
  enunciado: z.string(),
  tipo: backendTipoPerguntaSchema,
  valor: z.union([z.boolean(), z.string(), z.number()]),
});
export type BackendRespostaItem = z.infer<typeof backendRespostaItemSchema>;

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

export const backendAnamneseDetailSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  data_preenchimento: z.string(),
  respostas: z.array(backendRespostaItemSchema),
});
export type BackendAnamneseDetail = z.infer<typeof backendAnamneseDetailSchema>;

export function adaptBackendAnamneseDetail(data: BackendAnamneseDetail): Anamnese {
  return {
    id: String(data.id),
    respostas: data.respostas.map((r) => ({
      perguntaId: r.pergunta_id,
      enunciado: r.enunciado,
      tipo: mapBackendTipoPergunta(r.tipo),
      valor: String(r.valor),
    })),
  };
}

/** Corpo de resposta do POST — o back não devolve as respostas nele (issue #18). */
export const backendAnamneseCreatedSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  data_preenchimento: z.string(),
});
export type BackendAnamneseCreated = z.infer<typeof backendAnamneseCreatedSchema>;
