import { z } from "zod";

/**
 * Contrato ainda não existe no backend (Hality-Back-End só tem /health) —
 * este schema é a proposta que os services/ assumem até o back-end
 * publicar o real. Ver Hality-Front-End's README (fase 1 do plano de
 * migração) pra contexto completo.
 */

export const roleSchema = z.enum(["paciente", "profissional", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const usuarioSchema = z.object({
  id: z.string(),
  nome: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  criadoEm: z.iso.datetime(),
});
export type Usuario = z.infer<typeof usuarioSchema>;
