import { apiClient } from "@/lib/api-client";
import {
  adaptBackendClassificacoes,
  backendClassificacoesSchema,
  type Classificacao,
} from "@/types/classificacao";

export const classificacaoService = {
  /** Em ordem de nível (1 a 3). */
  async listar(): Promise<Classificacao[]> {
    const data = await apiClient.get<unknown>("/api/v1/classificacoes");
    return adaptBackendClassificacoes(backendClassificacoesSchema.parse(data));
  },
};
