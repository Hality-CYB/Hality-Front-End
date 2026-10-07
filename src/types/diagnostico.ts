import { z } from "zod";
import { backendConteudoSchema, textosDoConteudo } from "@/types/conteudo";
import {
  adaptBackendRespostas,
  backendRespostaArmazenadaSchema,
  respostaAnamneseSchema,
} from "@/types/anamnese";

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
  /** Respostas da anamnese que geraram o diagnóstico — já vêm no detalhe do back. */
  respostasAnamnese: z.array(respostaAnamneseSchema).optional(),
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
      /** Classificação dada pelo profissional; `nivel` do diagnóstico continua sendo o da IA. */
      nivel: diagnosticoNivelSchema.nullable(),
      nivelCorrigido: z.boolean(),
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

const backendClassificacaoResumoSchema = z.object({
  codigo: z.string(),
  nome_exibicao: z.string(),
  ordem: z.number(),
});

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
  anamnese: z.object({ id: z.number(), respostas: z.array(backendRespostaArmazenadaSchema) }),
  conteudos: z
    .array(z.object({ id: z.number(), titulo: z.string(), conteudo: backendConteudoSchema }))
    .optional(),
  revisao: z
    .object({
      profissional_nome: z.string().nullable(),
      data_revisao: z.string().nullable(),
      observacoes: z.string().nullable(),
      // #102 do back: a revisão traz a classificação dada pelo profissional.
      classificacao: backendClassificacaoResumoSchema.nullable().optional(),
      nivel_corrigido: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  erro: z.string().nullable().optional(),
});
export type BackendDiagnosticoDetail = z.infer<typeof backendDiagnosticoDetailSchema>;

export function nivelDaOrdem(ordem: number | undefined): DiagnosticoNivel | null {
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
    respostasAnamnese: adaptBackendRespostas(data.anamnese.respostas),
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
          // O status diz se houve revisão: `concluido` só depois do profissional.
          revisado: data.status === "concluido",
          profissionalNome: data.revisao.profissional_nome,
          revisadoEm: data.revisao.data_revisao,
          observacoes: data.revisao.observacoes,
          nivel: nivelDaOrdem(data.revisao.classificacao?.ordem),
          nivelCorrigido: data.revisao.nivel_corrigido ?? false,
        }
      : null,
  };
}

/** O nível que vale para o paciente: o do profissional, se houve revisão; senão, o da IA. */
export function nivelFinal(d: Pick<Diagnostico, "nivel" | "revisao">): DiagnosticoNivel | null {
  return d.revisao?.revisado ? (d.revisao.nivel ?? d.nivel) : d.nivel;
}

export type DiagnosticoResumo = Pick<Diagnostico, "id" | "nivel" | "status" | "criadoEm"> & {
  pacienteId?: string;
  pacienteNome?: string;
  revisado?: boolean;
  /** O profissional mudou a classificação da IA. */
  nivelCorrigido?: boolean;
};

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

/** Código canônico de cada nível no back (`classificacoes_diagnostico.codigo`). */
export const CODIGO_POR_NIVEL: Record<DiagnosticoNivel, string> = {
  1: "halito_normal",
  2: "halitose_intima",
  3: "mau_halito_social",
};

const backendPacienteResumoSchema = z.object({ id: z.string(), nome: z.string() });

/** `GET /profissional/diagnosticos` (#100 do back): só pacientes com vínculo ativo. */
export const backendDiagnosticoProfissionalListSchema = z.object({
  itens: z.array(
    z.object({
      id: z.number(),
      paciente: backendPacienteResumoSchema,
      data_diagnostico: z.string(),
      status: statusDiagnosticoSchema,
      classificacao_automatica: backendClassificacaoResumoSchema.nullable(),
      tem_revisao: z.boolean(),
      revisao: z
        .object({
          classificacao: backendClassificacaoResumoSchema,
          nivel_corrigido: z.boolean(),
        })
        .nullable()
        .optional(),
    }),
  ),
  pagina: z.number(),
  limite: z.number(),
  total: z.number(),
  total_paginas: z.number(),
});
export type BackendDiagnosticoProfissionalList = z.infer<
  typeof backendDiagnosticoProfissionalListSchema
>;

export function adaptBackendDiagnosticoProfissionalList(
  data: BackendDiagnosticoProfissionalList,
): PaginaDiagnosticos {
  return {
    itens: data.itens.map((item) => ({
      id: String(item.id),
      // Nível final: o revisado, quando houver revisão; senão, o da IA.
      nivel: nivelDaOrdem(
        item.revisao?.classificacao.ordem ?? item.classificacao_automatica?.ordem,
      ),
      nivelCorrigido: item.revisao?.nivel_corrigido ?? false,
      status: item.status,
      criadoEm: item.data_diagnostico,
      pacienteId: item.paciente.id,
      pacienteNome: item.paciente.nome,
      revisado: item.tem_revisao,
    })),
    pagina: data.pagina,
    total: data.total,
    totalPaginas: data.total_paginas,
  };
}

const backendRevisaoProfissionalSchema = z.object({
  id: z.number(),
  version: z.number(),
  classificacao: backendClassificacaoResumoSchema,
  profissional_id: z.string(),
  profissional_nome: z.string().nullable(),
  observacao: z.string().nullable(),
  criado_em: z.string(),
});
type BackendRevisaoProfissional = z.infer<typeof backendRevisaoProfissionalSchema>;

/** `GET /profissional/diagnosticos/{id}` (#100 do back). */
export const backendDiagnosticoProfissionalDetalheSchema = z.object({
  id: z.number(),
  data_diagnostico: z.string(),
  status: statusDiagnosticoSchema,
  paciente: backendPacienteResumoSchema,
  /** Resultado original da IA, preservado mesmo depois da revisão. */
  automatico: z
    .object({
      classificacao: backendClassificacaoResumoSchema.nullable(),
      confianca_ia: z.number().nullable(),
    })
    .nullable(),
  revisao: backendRevisaoProfissionalSchema.nullable(),
  historico_revisoes: z.array(backendRevisaoProfissionalSchema),
  version: z.number(),
});
export type BackendDiagnosticoProfissionalDetalhe = z.infer<
  typeof backendDiagnosticoProfissionalDetalheSchema
>;

export const backendRevisaoProfissionalResponseSchema = z.object({
  revisao: backendRevisaoProfissionalSchema,
  version: z.number(),
});

export type RevisaoProfissional = {
  id: string;
  versao: number;
  nivel: DiagnosticoNivel | null;
  profissionalNome: string | null;
  observacao: string | null;
  criadoEm: string;
};

/**
 * O que a visão do profissional acrescenta ao detalhe comum: de quem é o
 * diagnóstico, a revisão atual com o histórico, e a versão a reenviar na
 * próxima revisão (controle de concorrência do back).
 */
export type DiagnosticoProfissional = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  /** Nível dado pela IA, antes de qualquer revisão. */
  nivelIA: DiagnosticoNivel | null;
  revisaoAtual: RevisaoProfissional | null;
  historico: RevisaoProfissional[];
  versao: number;
};

export function adaptBackendRevisaoProfissional(
  data: BackendRevisaoProfissional,
): RevisaoProfissional {
  return {
    id: String(data.id),
    versao: data.version,
    nivel: nivelDaOrdem(data.classificacao.ordem),
    profissionalNome: data.profissional_nome,
    observacao: data.observacao,
    criadoEm: data.criado_em,
  };
}

export function adaptBackendDiagnosticoProfissional(
  data: BackendDiagnosticoProfissionalDetalhe,
): DiagnosticoProfissional {
  return {
    id: String(data.id),
    pacienteId: data.paciente.id,
    pacienteNome: data.paciente.nome,
    nivelIA: nivelDaOrdem(data.automatico?.classificacao?.ordem),
    revisaoAtual: data.revisao ? adaptBackendRevisaoProfissional(data.revisao) : null,
    historico: data.historico_revisoes.map(adaptBackendRevisaoProfissional),
    versao: data.version,
  };
}
