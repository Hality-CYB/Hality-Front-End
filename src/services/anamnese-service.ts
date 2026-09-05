import { apiClient } from "@/lib/api-client";
import {
  anamneseSchema,
  perguntaAnamneseSchema,
  respostaAnamneseSchema,
  type Anamnese,
  type PerguntaAnamnese,
  type RespostaAnamnese,
} from "@/types/anamnese";
import { z } from "zod";

export const anamneseService = {
  async listarPerguntas(): Promise<PerguntaAnamnese[]> {
    const data = await apiClient.get<unknown>("/api/v1/anamnese/perguntas");
    return z.array(perguntaAnamneseSchema).parse(data);
  },

  async buscar(id: string): Promise<Anamnese> {
    const data = await apiClient.get<unknown>(`/api/v1/anamnese/${id}`);
    return anamneseSchema.parse(data);
  },

  async criar(respostas: RespostaAnamnese[]): Promise<Anamnese> {
    const data = await apiClient.post<unknown>("/api/v1/anamnese", {
      respostas: respostas.map((r) => respostaAnamneseSchema.parse(r)),
    });
    return anamneseSchema.parse(data);
  },
};
