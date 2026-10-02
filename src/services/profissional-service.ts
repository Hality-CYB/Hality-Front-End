import { apiClient } from "@/lib/api-client";
import {
  adaptBackendResumoProfissional,
  backendResumoProfissionalSchema,
  profissionalSchema,
  type Profissional,
  type ResumoProfissional,
} from "@/types/profissional";
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

  async resumo(): Promise<ResumoProfissional> {
    const data = await apiClient.get<unknown>("/api/v1/profissional/resumo");
    return adaptBackendResumoProfissional(backendResumoProfissionalSchema.parse(data));
  },
};
