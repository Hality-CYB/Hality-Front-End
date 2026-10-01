import { z } from "zod";

/**
 * Contrato de `/vinculos` (PR #88 do back, mergeada): o profissional vincula
 * um paciente que já tem cadastro, pelo e-mail. Não existe cadastro de
 * paciente feito pelo profissional.
 */
export const backendVinculoDetailSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  paciente_nome: z.string(),
  paciente_email: z.string(),
  data_vinculo: z.string(),
  ativo: z.boolean(),
});
export type BackendVinculoDetail = z.infer<typeof backendVinculoDetailSchema>;

export type Vinculo = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail: string;
  vinculadoEm: string;
  ativo: boolean;
};

export function adaptBackendVinculo(data: BackendVinculoDetail): Vinculo {
  return {
    id: String(data.id),
    pacienteId: data.paciente_id,
    pacienteNome: data.paciente_nome,
    pacienteEmail: data.paciente_email,
    vinculadoEm: data.data_vinculo,
    ativo: data.ativo,
  };
}
