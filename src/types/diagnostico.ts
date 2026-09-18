import { z } from "zod";
import { backendConteudoSchema, textosDoConteudo } from "@/types/conteudo";

/**
 * Reconcilia as 3 formas divergentes que Design/ tinha pra "um exame"
 * (campo de dono do exame drifted: `patient` no Professional, `user` no
 * Admin, implícito no Patient) numa só. Adiciona `modeloVersao` e os
 * campos de revisão pra rastreabilidade (RNF16), que nenhuma das 3
 * versões de Design/ tinha.
 */

export const diagnosticoNivelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type DiagnosticoNivel = z.infer<typeof diagnosticoNivelSchema>;

export const statusDiagnosticoSchema = z.enum([
  "processando",
  "aguardando_revisao",
  "concluido",
  "falha",
]);
export type StatusDiagnostico = z.infer<typeof statusDiagnosticoSchema>;

/**
 * `GET /diagnosticos/{id}` não manda `categoria` nos itens de `conteudos`
 * (só `id`/`titulo`/`conteudo`), mesmo a tabela `conteudos` tendo essa
 * coluna — confirmado rodando o endpoint em 2026-09-18. Assume esse valor
 * enquanto o back não expõe o campo de verdade; combinado com o time.
 */
export const CATEGORIA_CONTEUDO_PADRAO = "geral";

export const diagnosticoSchema = z.object({
  id: z.string(),
  pacienteId: z.string().optional(),
  profissionalId: z.string().optional(),
  nivel: diagnosticoNivelSchema.nullable(),
  status: statusDiagnosticoSchema,
  imagemUrl: z.string(),
  anamneseId: z.string(),
  modeloVersao: z.string().optional(),
  confiancaIA: z.number().min(0).max(100).optional(),
  criadoEm: z.string(),
  revisadoPor: z.string().optional(),
  revisadoEm: z.iso.datetime().optional(),
  revisao: z
    .object({
      revisado: z.boolean(),
      profissionalNome: z.string().nullable(),
      revisadoEm: z.string().nullable(),
      observacoes: z.string().nullable(),
    })
    .nullable()
    .optional(),
  conteudos: z
    .array(
      z.object({
        id: z.number(),
        titulo: z.string(),
        categoria: z.string(),
        textos: z.array(z.string()),
      }),
    )
    .optional(),
});
export type Diagnostico = z.infer<typeof diagnosticoSchema>;

export const backendDiagnosticoCreatedSchema = z.object({
  id: z.number(),
  status: statusDiagnosticoSchema,
  data_diagnostico: z.string(),
  anamnese_id: z.number(),
});
export type BackendDiagnosticoCreated = z.infer<typeof backendDiagnosticoCreatedSchema>;

export const backendDiagnosticoDetailSchema = z.object({
  id: z.number(),
  data_diagnostico: z.string(),
  status: statusDiagnosticoSchema,
  classificacao: z
    .object({
      id: z.number(),
      codigo: z.string(),
      nome_exibicao: z.string(),
      ordem: z.number(),
    })
    .nullable(),
  escala_saburra: z.number().nullable(),
  confianca_ia: z.number().nullable(),
  imagens: z.array(
    z.object({
      id: z.number(),
      url_arquivo: z.string(),
      ordem: z.number().nullable().optional(),
    }),
  ),
  anamnese: z.object({ id: z.number() }),
  conteudos: z
    .array(z.object({ id: z.number(), titulo: z.string(), conteudo: backendConteudoSchema }))
    .optional(),
  revisao: z
    .object({
      revisado: z.boolean(),
      profissional_nome: z.string().nullable(),
      data_revisao: z.string().nullable(),
      observacoes: z.string().nullable(),
    })
    .nullable()
    .optional(),
  erro: z.string().nullable().optional(),
});
export type BackendDiagnosticoDetail = z.infer<typeof backendDiagnosticoDetailSchema>;

function nivelDaOrdem(ordem: number | undefined): DiagnosticoNivel | null {
  const nivel = diagnosticoNivelSchema.safeParse(ordem);
  return nivel.success ? nivel.data : null;
}

export function adaptBackendDiagnosticoDetail(data: BackendDiagnosticoDetail): Diagnostico {
  return {
    id: String(data.id),
    nivel: nivelDaOrdem(data.classificacao?.ordem),
    status: data.status,
    imagemUrl: data.imagens[0]?.url_arquivo ?? "",
    anamneseId: String(data.anamnese.id),
    confiancaIA: data.confianca_ia === null ? undefined : Math.round(data.confianca_ia * 100),
    criadoEm: data.data_diagnostico,
    conteudos: data.conteudos?.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      categoria: CATEGORIA_CONTEUDO_PADRAO,
      textos: textosDoConteudo(item.conteudo),
    })),
    revisao: data.revisao
      ? {
          revisado: data.revisao.revisado,
          profissionalNome: data.revisao.profissional_nome,
          revisadoEm: data.revisao.data_revisao,
          observacoes: data.revisao.observacoes,
        }
      : null,
  };
}

export type DiagnosticoResumo = Pick<Diagnostico, "id" | "nivel" | "status" | "criadoEm">;

export type PaginaDiagnosticos = {
  itens: DiagnosticoResumo[];
  pagina: number;
  total: number;
  totalPaginas: number;
};

export const backendDiagnosticoListResponseSchema = z.object({
  itens: z.array(
    z.object({
      id: z.number(),
      data_diagnostico: z.string(),
      status: statusDiagnosticoSchema,
      classificacao: z
        .object({ codigo: z.string(), nome_exibicao: z.string(), ordem: z.number() })
        .nullable(),
      escala_saburra: z.number().nullable(),
    }),
  ),
  pagina: z.number(),
  limite: z.number(),
  total: z.number(),
  total_paginas: z.number(),
});
export type BackendDiagnosticoListResponse = z.infer<typeof backendDiagnosticoListResponseSchema>;

export function adaptBackendDiagnosticoList(
  data: BackendDiagnosticoListResponse,
): PaginaDiagnosticos {
  return {
    itens: data.itens.map((item) => ({
      id: String(item.id),
      nivel: nivelDaOrdem(item.classificacao?.ordem),
      status: item.status,
      criadoEm: item.data_diagnostico,
    })),
    pagina: data.pagina,
    total: data.total,
    totalPaginas: data.total_paginas,
  };
}
