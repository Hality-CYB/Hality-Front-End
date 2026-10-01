import { z } from "zod";
import { usuarioSchema } from "@/types/usuario";
import {
  adaptBackendDiagnosticoList,
  backendDiagnosticoListResponseSchema,
  nivelDaOrdem,
  type DiagnosticoNivel,
  type PaginaDiagnosticos,
} from "@/types/diagnostico";

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

/**
 * Contrato de `GET /pacientes` e `GET /pacientes/{id}` da PR #97 do back
 * (ainda não mergeada). O profissional só enxerga pacientes com vínculo
 * ativo; o admin enxerga todos.
 */
const backendPacienteListItemSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  telefone: z.string().nullable(),
  ativo: z.boolean(),
  total_diagnosticos: z.number(),
  ultimo_diagnostico_em: z.string().nullable(),
  ultimo_nivel: z.number().nullable(),
});

export const backendPacienteListResponseSchema = z.object({
  itens: z.array(backendPacienteListItemSchema),
  pagina: z.number(),
  limite: z.number(),
  total: z.number(),
  total_paginas: z.number(),
});
export type BackendPacienteListResponse = z.infer<typeof backendPacienteListResponseSchema>;

/**
 * TODO(backend): proposta do front. O back não tem cadastro de paciente pelo
 * profissional — a PR #88 só vincula um paciente que já tem conta. Resposta
 * proposta: o mesmo item de `GET /pacientes`, já vinculado ao profissional.
 */
export const backendPacienteCriadoSchema = backendPacienteListItemSchema;

export const backendPacienteDetailSchema = backendPacienteListItemSchema.extend({
  vinculos: z.array(
    z.object({
      id: z.number(),
      profissional_id: z.string(),
      profissional_nome: z.string(),
      data_vinculo: z.string(),
      ativo: z.boolean(),
      encerrado_em: z.string().nullable(),
    }),
  ),
  diagnosticos: backendDiagnosticoListResponseSchema,
});
export type BackendPacienteDetail = z.infer<typeof backendPacienteDetailSchema>;

export type PacienteResumo = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  totalDiagnosticos: number;
  ultimoDiagnosticoEm: string | null;
  ultimoNivel: DiagnosticoNivel | null;
};

export type PaginaPacientes = {
  itens: PacienteResumo[];
  pagina: number;
  total: number;
  totalPaginas: number;
};

export type PacienteDetalhe = PacienteResumo & {
  vinculadoEm: string | null;
  diagnosticos: PaginaDiagnosticos;
};

export function adaptBackendPacienteItem(
  item: z.infer<typeof backendPacienteListItemSchema>,
): PacienteResumo {
  return {
    id: item.id,
    nome: item.nome,
    email: item.email,
    telefone: item.telefone,
    ativo: item.ativo,
    totalDiagnosticos: item.total_diagnosticos,
    ultimoDiagnosticoEm: item.ultimo_diagnostico_em,
    ultimoNivel: nivelDaOrdem(item.ultimo_nivel ?? undefined),
  };
}

export function adaptBackendPacienteList(data: BackendPacienteListResponse): PaginaPacientes {
  return {
    itens: data.itens.map(adaptBackendPacienteItem),
    pagina: data.pagina,
    total: data.total,
    totalPaginas: data.total_paginas,
  };
}

export function adaptBackendPacienteDetail(data: BackendPacienteDetail): PacienteDetalhe {
  const vinculoAtivo = data.vinculos.find((v) => v.ativo);
  return {
    ...adaptBackendPacienteItem(data),
    vinculadoEm: vinculoAtivo?.data_vinculo ?? null,
    diagnosticos: adaptBackendDiagnosticoList(data.diagnosticos),
  };
}
