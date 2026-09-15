import { apiClient } from "@/lib/api-client";
import {
  adaptBackendAnamneseDetail,
  adaptBackendQuestionario,
  backendAnamneseCreatedSchema,
  backendAnamneseDetailSchema,
  backendQuestionarioSchema,
  mapTipoPerguntaParaBackend,
  type Anamnese,
  type QuestionarioAnamnese,
  type RespostaAnamnese,
  type TipoPergunta,
} from "@/types/anamnese";

/**
 * `valor` chega do wizard sempre como string — aqui é convertido pro tipo
 * que o back exige por pergunta (RespostaItem.valor: bool | str | int),
 * já que `_validar_valor` no back rejeita string pra boolean/escala.
 *
 * String vazia (pergunta não respondida) é mantida como string: é o jeito
 * do back detectar "ausente" (`valor == ""`) antes mesmo de olhar o tipo —
 * convertê-la pra `false`/`0` faria uma pergunta obrigatória não
 * respondida passar como "respondida".
 */
function paraValorBackend(tipo: TipoPergunta, valor: string): boolean | string | number {
  if (valor === "") return valor;
  if (tipo === "sim_nao") return valor === "Sim";
  if (tipo === "escala") return Number(valor);
  return valor;
}

export const anamneseService = {
  async listarPerguntas(): Promise<QuestionarioAnamnese> {
    const data = await apiClient.get<unknown>("/api/v1/anamneses/questionario");
    return adaptBackendQuestionario(backendQuestionarioSchema.parse(data));
  },

  async buscar(id: string): Promise<Anamnese> {
    const data = await apiClient.get<unknown>(`/api/v1/anamneses/${id}`);
    return adaptBackendAnamneseDetail(backendAnamneseDetailSchema.parse(data));
  },

  async criar(input: {
    versaoQuestionario: string;
    respostas: RespostaAnamnese[];
  }): Promise<Anamnese> {
    const data = await apiClient.post<unknown>("/api/v1/anamneses", {
      versao_questionario: input.versaoQuestionario,
      respostas: input.respostas.map((r) => ({
        pergunta_id: r.perguntaId,
        enunciado: r.enunciado,
        tipo: mapTipoPerguntaParaBackend(r.tipo),
        valor: paraValorBackend(r.tipo, r.valor),
      })),
    });
    const criada = backendAnamneseCreatedSchema.parse(data);
    return { id: String(criada.id), respostas: input.respostas };
  },
};
