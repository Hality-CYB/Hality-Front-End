import { z } from "zod";
import { usuarioSchema } from "@/types/usuario";

export const profissionalSchema = usuarioSchema.extend({
  role: z.literal("profissional"),
  registroProfissional: z.string(),
  especialidade: z.string().optional(),
});
export type Profissional = z.infer<typeof profissionalSchema>;
