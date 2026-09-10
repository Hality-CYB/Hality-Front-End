import { apiClient } from "@/lib/api-client";
import { diagnosticoSchema, type Diagnostico, type DiagnosticoNivel } from "@/types/diagnostico";
import { z } from "zod";

export const diagnosticoService = {
  async listar(filtro?: {
    pacienteId?: string;
    profissionalId?: string;
    status?: string;
  }): Promise<Diagnostico[]> {
    const params = new URLSearchParams();
    if (filtro?.pacienteId) params.set("pacienteId", filtro.pacienteId);
    if (filtro?.profissionalId) params.set("profissionalId", filtro.profissionalId);
    if (filtro?.status) params.set("status", filtro.status);
    const query = params.size ? `?${params.toString()}` : "";
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos${query}`);
    return z.array(diagnosticoSchema).parse(data);
  },

  async buscar(id: string): Promise<Diagnostico> {
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos/${id}`);
    return diagnosticoSchema.parse(data);
  },

  async criar(input: {
    pacienteId: string;
    profissionalId?: string;
    imagemUrl: string;
    anamneseId: string;
  }): Promise<Diagnostico> {
    const data = await apiClient.post<unknown>("/api/v1/diagnosticos", input);
    return diagnosticoSchema.parse(data);
  },

  async revisar(
    id: string,
    input: { nivel: DiagnosticoNivel; revisadoPor: string },
  ): Promise<Diagnostico> {
    const data = await apiClient.put<unknown>(`/api/v1/diagnosticos/${id}/revisar`, input);
    return diagnosticoSchema.parse(data);
  },
};
