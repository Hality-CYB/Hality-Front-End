import { z } from "zod";
import {
  nivelDaOrdem,
  statusDiagnosticoSchema,
  type DiagnosticoNivel,
  type StatusDiagnostico,
} from "@/types/diagnostico";
import { mapBackendRoleToFrontend, type Usuario } from "@/types/usuario";

/** Contratos das rotas `/admin/*` do back (#94, #95, #96), todas exigem papel admin. */

export type Pagina<T> = { itens: T[]; pagina: number; total: number; totalPaginas: number };

function paginaSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    itens: z.array(item),
    pagina: z.number(),
    limite: z.number(),
    total: z.number(),
    total_paginas: z.number(),
  });
}

function adaptPagina<B, F>(
  data: { itens: B[]; pagina: number; total: number; total_paginas: number },
  adaptar: (item: B) => F,
): Pagina<F> {
  return {
    itens: data.itens.map(adaptar),
    pagina: data.pagina,
    total: data.total,
    totalPaginas: data.total_paginas,
  };
}

// --- Usuários (`/admin/usuarios`, `PATCH /admin/profissionais/{id}`) ---

export const backendAdminUsuarioSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  telefone: z.string().nullable(),
  role: z.string(),
  ativo: z.boolean(),
  /** #163 do back: convite de primeiro acesso ainda não aceito. */
  convite_pendente: z.boolean().optional().default(false),
  created_at: z.string(),
  profissional: z
    .object({
      registro_profissional: z.string().nullable(),
      especialidade: z.string().nullable(),
      vinculado_hality: z.boolean(),
    })
    .nullable(),
});
export type BackendAdminUsuario = z.infer<typeof backendAdminUsuarioSchema>;
export const backendAdminUsuarioListSchema = paginaSchema(backendAdminUsuarioSchema);

export function adaptBackendAdminUsuario(data: BackendAdminUsuario): Usuario {
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    role: mapBackendRoleToFrontend(data.role),
    ativo: data.ativo,
    convitePendente: data.convite_pendente,
    criadoEm: data.created_at,
    perfilProfissional: data.profissional
      ? {
          registro: data.profissional.registro_profissional,
          especialidade: data.profissional.especialidade,
          vinculadoHality: data.profissional.vinculado_hality,
        }
      : null,
  };
}

export function adaptBackendAdminUsuarioList(
  data: z.infer<typeof backendAdminUsuarioListSchema>,
): Pagina<Usuario> {
  return adaptPagina(data, adaptBackendAdminUsuario);
}

// --- Vínculos (`/admin/vinculos`) ---

export const backendAdminVinculoSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  paciente_nome: z.string(),
  profissional_id: z.string(),
  profissional_nome: z.string(),
  data_vinculo: z.string(),
  ativo: z.boolean(),
  encerrado_em: z.string().nullable(),
});
export type BackendAdminVinculo = z.infer<typeof backendAdminVinculoSchema>;
export const backendAdminVinculoListSchema = paginaSchema(backendAdminVinculoSchema);

export type Vinculo = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  vinculadoEm: string;
  ativo: boolean;
  encerradoEm: string | null;
};

export function adaptBackendAdminVinculo(data: BackendAdminVinculo): Vinculo {
  return {
    id: String(data.id),
    pacienteId: data.paciente_id,
    pacienteNome: data.paciente_nome,
    profissionalId: data.profissional_id,
    profissionalNome: data.profissional_nome,
    vinculadoEm: data.data_vinculo,
    ativo: data.ativo,
    encerradoEm: data.encerrado_em,
  };
}

export function adaptBackendAdminVinculoList(
  data: z.infer<typeof backendAdminVinculoListSchema>,
): Pagina<Vinculo> {
  return adaptPagina(data, adaptBackendAdminVinculo);
}

// --- Diagnósticos (`/admin/diagnosticos`, contrato da #159 do back) ---

const classificacaoResumoSchema = z
  .object({ codigo: z.string(), nome_exibicao: z.string(), ordem: z.number() })
  .nullable();

const automaticaSchema = z.object({
  classificacao: classificacaoResumoSchema,
  escala_saburra: z.number().nullable(),
  confianca_ia: z.number().nullable(),
});

/** Revisão vigente: a última do histórico (ou os campos legados do diagnóstico). */
const revisaoAdminSchema = z.object({
  status: z.enum(["pendente", "concluida"]),
  profissional_revisor_id: z.string().nullable(),
  profissional_revisor_nome: z.string().nullable(),
  data_revisao: z.string().nullable(),
  classificacao: classificacaoResumoSchema,
  observacoes: z.string().nullable(),
});

const pacienteAdminSchema = z.object({ id: z.string(), nome: z.string() });

export const backendAdminDiagnosticoItemSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  paciente: pacienteAdminSchema,
  data: z.string(),
  status: statusDiagnosticoSchema,
  automatica: automaticaSchema,
  revisao: revisaoAdminSchema,
  qtd_imagens: z.number(),
});
export const backendAdminDiagnosticoListSchema = paginaSchema(backendAdminDiagnosticoItemSchema);

export type RevisaoAdmin = {
  revisado: boolean;
  revisorId: string | null;
  revisorNome: string | null;
  revisadoEm: string | null;
  /** Nível dado pelo profissional; nulo em revisão legada (sem classificação gravada). */
  nivel: DiagnosticoNivel | null;
  observacoes: string | null;
};

/**
 * Item da listagem do admin. `nivel` é o que vale (revisado > IA); `nivelIA`
 * fica para mostrar quando a revisão mudou o resultado.
 */
export type DiagnosticoAdminResumo = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  criadoEm: string;
  status: StatusDiagnostico;
  nivel: DiagnosticoNivel | null;
  nivelIA: DiagnosticoNivel | null;
  /** A revisão mudou o nível dado pela IA. */
  nivelCorrigido: boolean;
  revisao: RevisaoAdmin;
  qtdImagens: number;
};

function adaptRevisaoAdmin(data: z.infer<typeof revisaoAdminSchema>): RevisaoAdmin {
  return {
    revisado: data.status === "concluida",
    revisorId: data.profissional_revisor_id,
    revisorNome: data.profissional_revisor_nome,
    revisadoEm: data.data_revisao,
    nivel: nivelDaOrdem(data.classificacao?.ordem),
    observacoes: data.observacoes,
  };
}

/** Revisado prevalece sobre a IA, igual ao detalhe do paciente e do profissional. */
function niveisDoDiagnostico(
  automatica: z.infer<typeof automaticaSchema>,
  revisao: RevisaoAdmin,
): Pick<DiagnosticoAdminResumo, "nivel" | "nivelIA" | "nivelCorrigido"> {
  const nivelIA = nivelDaOrdem(automatica.classificacao?.ordem);
  const nivel = revisao.nivel ?? nivelIA;
  return { nivel, nivelIA, nivelCorrigido: revisao.nivel !== null && revisao.nivel !== nivelIA };
}

function adaptItemAdmin(item: z.infer<typeof backendAdminDiagnosticoItemSchema>) {
  const revisao = adaptRevisaoAdmin(item.revisao);
  return {
    id: String(item.id),
    pacienteId: item.paciente_id,
    pacienteNome: item.paciente.nome,
    criadoEm: item.data,
    status: item.status,
    ...niveisDoDiagnostico(item.automatica, revisao),
    revisao,
    qtdImagens: item.qtd_imagens,
  };
}

export function adaptBackendAdminDiagnosticoList(
  data: z.infer<typeof backendAdminDiagnosticoListSchema>,
): Pagina<DiagnosticoAdminResumo> {
  return adaptPagina(data, adaptItemAdmin);
}

const indisponivelSchema = z.object({ disponivel: z.boolean(), motivo: z.string() });

export const backendAdminDiagnosticoDetalheSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  paciente: pacienteAdminSchema,
  data: z.string(),
  status: statusDiagnosticoSchema,
  erro: z.string().nullable(),
  automatica: automaticaSchema,
  revisao: revisaoAdminSchema,
  historico_revisoes: z.array(
    z.object({
      profissional_revisor_id: z.string(),
      profissional_revisor_nome: z.string().nullable(),
      data_revisao: z.string(),
      classificacao: classificacaoResumoSchema,
      observacoes: z.string().nullable(),
    }),
  ),
  dataset: indisponivelSchema,
  imagem: indisponivelSchema,
  anamnese_id: z.number().nullable(),
  qtd_imagens: z.number(),
});

/**
 * Detalhe do admin. O back não expõe de propósito as respostas da anamnese
 * nem as imagens (`imagem.disponivel` é sempre false por enquanto).
 */
export type DiagnosticoAdminDetalhe = Omit<DiagnosticoAdminResumo, "qtdImagens"> & {
  erro: string | null;
  escalaSaburra: number | null;
  confiancaIA: number | null;
  historico: Omit<RevisaoAdmin, "revisado">[];
  imagem: { disponivel: boolean; motivo: string };
  dataset: { disponivel: boolean; motivo: string };
  anamneseId: string | null;
  qtdImagens: number;
};

export function adaptBackendAdminDiagnosticoDetalhe(
  data: z.infer<typeof backendAdminDiagnosticoDetalheSchema>,
): DiagnosticoAdminDetalhe {
  const revisao = adaptRevisaoAdmin(data.revisao);
  return {
    id: String(data.id),
    pacienteId: data.paciente_id,
    pacienteNome: data.paciente.nome,
    criadoEm: data.data,
    status: data.status,
    erro: data.erro,
    ...niveisDoDiagnostico(data.automatica, revisao),
    escalaSaburra: data.automatica.escala_saburra,
    // O back manda fração (0-1); a tela mostra porcentagem.
    confiancaIA:
      data.automatica.confianca_ia === null ? null : Math.round(data.automatica.confianca_ia * 100),
    revisao,
    historico: data.historico_revisoes.map((r) => ({
      revisorId: r.profissional_revisor_id,
      revisorNome: r.profissional_revisor_nome,
      revisadoEm: r.data_revisao,
      nivel: nivelDaOrdem(r.classificacao?.ordem),
      observacoes: r.observacoes,
    })),
    imagem: data.imagem,
    dataset: data.dataset,
    anamneseId: data.anamnese_id === null ? null : String(data.anamnese_id),
    qtdImagens: data.qtd_imagens,
  };
}

// --- Resumo (`GET /admin/resumo`, #158 do back) ---

export const backendAdminResumoSchema = z.object({
  periodo: z.object({ inicio: z.string(), fim: z.string(), timezone: z.string() }),
  diagnosticos: z.object({
    total: z.number(),
    /** Chave = id da classificação no banco (não o nível 1-3) ou "sem_classificacao". */
    por_classificacao: z.record(z.string(), z.number()),
    por_status: z.record(z.string(), z.number()),
  }),
  revisao: z.object({ pendentes: z.number(), revisados: z.number() }),
  /** Nulo até a regra clínica de com/sem halitose ser decidida. */
  halitose: z.record(z.string(), z.number()).nullable(),
});

/**
 * Números do painel do admin no período (padrão do back: últimos 30 dias, DEC-05).
 * TODO(backend): a contagem por classificação vem pelo id da tabela, sem
 * dizer qual id é qual nível, então ainda não é usada.
 */
export type ResumoAdmin = {
  inicio: string;
  fim: string;
  totalDiagnosticos: number;
  porStatus: Partial<Record<StatusDiagnostico, number>>;
  pendentes: number;
  revisados: number;
};

export function adaptBackendAdminResumo(
  data: z.infer<typeof backendAdminResumoSchema>,
): ResumoAdmin {
  return {
    inicio: data.periodo.inicio,
    fim: data.periodo.fim,
    totalDiagnosticos: data.diagnosticos.total,
    porStatus: data.diagnosticos.por_status,
    pendentes: data.revisao.pendentes,
    revisados: data.revisao.revisados,
  };
}
