import { z } from "zod";

/**
 * Reconcilia as 3 formas divergentes que Design/ tinha pra "um exame"
 * (campo de dono do exame drifted: `patient` no Professional, `user` no
 * Admin, implícito no Patient) numa só. Adiciona `modeloVersao` e os
 * campos de revisão pra rastreabilidade (RNF16), que nenhuma das 3
 * versões de Design/ tinha.
 */

export const diagnosticoNivelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type DiagnosticoNivel = z.infer<typeof diagnosticoNivelSchema>;

export const statusDiagnosticoSchema = z.enum(["processando", "aguardando_revisao", "concluido"]);
export type StatusDiagnostico = z.infer<typeof statusDiagnosticoSchema>;

export const diagnosticoSchema = z.object({
  id: z.string(),
  pacienteId: z.string(),
  profissionalId: z.string().optional(),
  nivel: diagnosticoNivelSchema.nullable(),
  status: statusDiagnosticoSchema,
  imagemUrl: z.string(),
  anamneseId: z.string(),
  modeloVersao: z.string(),
  confiancaIA: z.number().min(0).max(100).optional(),
  criadoEm: z.iso.datetime(),
  revisadoPor: z.string().optional(),
  revisadoEm: z.iso.datetime().optional(),
});
export type Diagnostico = z.infer<typeof diagnosticoSchema>;
