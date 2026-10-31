import { z } from "zod";
import { usuarioSchema } from "@/types/usuario";

export const profissionalSchema = usuarioSchema.extend({
  role: z.literal("profissional"),
  registroProfissional: z.string(),
  especialidade: z.string().optional(),
});
export type Profissional = z.infer<typeof profissionalSchema>;

/**
 * Contrato de `GET /profissional/resumo` (PR #89 do back, ainda não
 * mergeada). Sem `inicio`/`fim`, o back usa os últimos 30 dias; o período
 * definitivo ainda está em aberto no time (DEC-05), assim como os nomes dos
 * campos.
 */
export const backendResumoProfissionalSchema = z.object({
  periodo: z.object({ inicio: z.string(), fim: z.string(), timezone: z.string() }),
  pacientes_ativos: z.number(),
  diagnosticos_total: z.number(),
  pendentes_revisao: z.number(),
  ultimo_diagnostico_em: z.string().nullable(),
});
export type BackendResumoProfissional = z.infer<typeof backendResumoProfissionalSchema>;

export type ResumoProfissional = {
  pacientesAtivos: number;
  diagnosticosTotal: number;
  pendentesRevisao: number;
  ultimoDiagnosticoEm: string | null;
};

export function adaptBackendResumoProfissional(
  data: BackendResumoProfissional,
): ResumoProfissional {
  return {
    pacientesAtivos: data.pacientes_ativos,
    diagnosticosTotal: data.diagnosticos_total,
    pendentesRevisao: data.pendentes_revisao,
    ultimoDiagnosticoEm: data.ultimo_diagnostico_em,
  };
}
