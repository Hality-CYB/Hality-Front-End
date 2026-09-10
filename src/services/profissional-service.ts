import { apiClient } from "@/lib/api-client";
import { profissionalSchema, type Profissional } from "@/types/profissional";
import { z } from "zod";

export const profissionalService = {
  async listar(): Promise<Profissional[]> {
    const data = await apiClient.get<unknown>("/api/v1/profissionais");
    return z.array(profissionalSchema).parse(data);
  },

  async buscar(id: string): Promise<Profissional> {
    const data = await apiClient.get<unknown>(`/api/v1/profissionais/${id}`);
    return profissionalSchema.parse(data);
  },
};
