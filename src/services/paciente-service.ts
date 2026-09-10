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
};

export type { Paciente };
