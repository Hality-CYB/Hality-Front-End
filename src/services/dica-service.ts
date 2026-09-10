import { apiClient } from "@/lib/api-client";
import { dicaSchema, type Dica } from "@/types/dica";
import { z } from "zod";

type NovaDica = Omit<Dica, "id" | "criadoEm" | "visualizacoes">;

export const dicaService = {
  async listar(filtro?: { publicado?: boolean }): Promise<Dica[]> {
    const query = filtro?.publicado === undefined ? "" : `?publicado=${filtro.publicado}`;
    const data = await apiClient.get<unknown>(`/api/v1/dicas${query}`);
    return z.array(dicaSchema).parse(data);
  },

  async buscar(id: string): Promise<Dica> {
    const data = await apiClient.get<unknown>(`/api/v1/dicas/${id}`);
    return dicaSchema.parse(data);
  },

  async criar(dica: NovaDica): Promise<Dica> {
    const data = await apiClient.post<unknown>("/api/v1/dicas", dica);
    return dicaSchema.parse(data);
  },

  async atualizar(id: string, dica: Partial<NovaDica>): Promise<Dica> {
    const data = await apiClient.put<unknown>(`/api/v1/dicas/${id}`, dica);
    return dicaSchema.parse(data);
  },
};
