import { apiClient } from "@/lib/api-client";
import { pacienteSchema, type Paciente } from "@/types/paciente";
import { diagnosticoNivelSchema } from "@/types/diagnostico";
import { z } from "zod";

/** Resumo usado nas listas (RF30 — histórico por paciente vinculado). */
const pacienteComResumoSchema = pacienteSchema.extend({
  totalDiagnosticos: z.number(),
  ultimoDiagnosticoEm: z.iso.datetime().optional(),
  ultimoNivel: diagnosticoNivelSchema.nullable(),
});
export type PacienteComResumo = z.infer<typeof pacienteComResumoSchema>;

export const pacienteService = {
  async listar(filtro?: { profissionalId?: string }): Promise<PacienteComResumo[]> {
    const query = filtro?.profissionalId ? `?profissionalId=${filtro.profissionalId}` : "";
    const data = await apiClient.get<unknown>(`/api/v1/pacientes${query}`);
    return z.array(pacienteComResumoSchema).parse(data);
  },

  async buscar(id: string): Promise<PacienteComResumo> {
    const data = await apiClient.get<unknown>(`/api/v1/pacientes/${id}`);
    return pacienteComResumoSchema.parse(data);
  },

  /** Cadastro básico feito pelo profissional, pra liberar uma avaliação na hora. */
  async criar(input: {
    nome: string;
    email: string;
    telefone?: string;
    profissionalVinculadoId?: string;
  }): Promise<PacienteComResumo> {
    const data = await apiClient.post<unknown>("/api/v1/pacientes", input);
    return pacienteComResumoSchema.parse(data);
  },

  async vincularProfissional(
    pacienteId: string,
    profissionalId: string,
  ): Promise<PacienteComResumo> {
    const data = await apiClient.put<unknown>(
      `/api/v1/pacientes/${pacienteId}/vincular-profissional`,
      { profissionalId },
    );
    return pacienteComResumoSchema.parse(data);
  },
};

export type { Paciente };
