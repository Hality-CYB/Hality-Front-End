import { z } from "zod";
import { usuarioSchema } from "@/types/usuario";

/**
 * Consentimento LGPD (RNF02) — duas escolhas separadas e revogáveis, não
 * uma caixinha só. Nenhuma das duas existia em Design/ (o registro lá
 * sempre criava um paciente sem capturar consentimento algum).
 */
export const consentimentoSchema = z.object({
  aceito: z.boolean(),
  data: z.iso.datetime().optional(),
});
export type Consentimento = z.infer<typeof consentimentoSchema>;

export const pacienteSchema = usuarioSchema.extend({
  role: z.literal("paciente"),
  telefone: z.string(),
  profissionalVinculadoId: z.string().optional(),
  consentimentoDadosSaude: consentimentoSchema,
  consentimentoTreinamentoIA: consentimentoSchema,
});
export type Paciente = z.infer<typeof pacienteSchema>;
