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

// --- Diagnósticos (`/admin/diagnosticos`) ---

const classificacaoResumoSchema = z
  .object({ codigo: z.string(), nome_exibicao: z.string(), ordem: z.number() })
  .nullable();

export const backendAdminDiagnosticoItemSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  data_diagnostico: z.string(),
  status: statusDiagnosticoSchema,
  classificacao: classificacaoResumoSchema,
  tem_revisao: z.boolean(),
});
export const backendAdminDiagnosticoListSchema = paginaSchema(backendAdminDiagnosticoItemSchema);

/**
 * Item da listagem do admin.
 * TODO(backend): `nivelIA` é a classificação automática — o back do admin não
 * devolve o nível revisado, então aqui a regra "revisado > IA" não vale ainda.
 * TODO(backend): o item não traz o nome do paciente, só o id.
 */
export type DiagnosticoAdminResumo = {
  id: string;
  pacienteId: string;
  criadoEm: string;
  status: StatusDiagnostico;
  nivelIA: DiagnosticoNivel | null;
  revisado: boolean;
};

export function adaptBackendAdminDiagnosticoList(
  data: z.infer<typeof backendAdminDiagnosticoListSchema>,
): Pagina<DiagnosticoAdminResumo> {
  return adaptPagina(data, (item) => ({
    id: String(item.id),
    pacienteId: item.paciente_id,
    criadoEm: item.data_diagnostico,
    status: item.status,
    nivelIA: nivelDaOrdem(item.classificacao?.ordem),
    revisado: item.tem_revisao,
  }));
}

export const backendAdminDiagnosticoDetalheSchema = z.object({
  id: z.number(),
  paciente_id: z.string(),
  data_diagnostico: z.string(),
  status: statusDiagnosticoSchema,
  erro: z.string().nullable(),
  automatica: z.object({
    classificacao: classificacaoResumoSchema,
    escala_saburra: z.number().nullable(),
    confianca_ia: z.number().nullable(),
  }),
  revisao: z
    .object({
      profissional_revisor_id: z.string(),
      data_revisao: z.string(),
      observacoes: z.string().nullable(),
    })
    .nullable(),
  dataset: z.object({ disponivel: z.boolean(), motivo: z.string() }),
  anamnese_id: z.number(),
  qtd_imagens: z.number(),
});

/**
 * Detalhe do admin. O back não expõe de propósito as respostas da anamnese
 * nem as URLs das imagens (só a referência e a contagem).
 * TODO(backend): a revisão traz só o id do revisor (sem nome) e não traz o
 * nível revisado.
 */
export type DiagnosticoAdminDetalhe = {
  id: string;
  pacienteId: string;
  criadoEm: string;
  status: StatusDiagnostico;
  erro: string | null;
  nivelIA: DiagnosticoNivel | null;
  escalaSaburra: number | null;
  confiancaIA: number | null;
  revisao: { revisorId: string; revisadoEm: string; observacoes: string | null } | null;
  dataset: { disponivel: boolean; motivo: string };
  anamneseId: string;
  qtdImagens: number;
};

export function adaptBackendAdminDiagnosticoDetalhe(
  data: z.infer<typeof backendAdminDiagnosticoDetalheSchema>,
): DiagnosticoAdminDetalhe {
  return {
    id: String(data.id),
    pacienteId: data.paciente_id,
    criadoEm: data.data_diagnostico,
    status: data.status,
    erro: data.erro,
    nivelIA: nivelDaOrdem(data.automatica.classificacao?.ordem),
    escalaSaburra: data.automatica.escala_saburra,
    // O back manda fração (0-1); a tela mostra porcentagem.
    confiancaIA:
      data.automatica.confianca_ia === null ? null : Math.round(data.automatica.confianca_ia * 100),
    revisao: data.revisao
      ? {
          revisorId: data.revisao.profissional_revisor_id,
          revisadoEm: data.revisao.data_revisao,
          observacoes: data.revisao.observacoes,
        }
      : null,
    dataset: data.dataset,
    anamneseId: String(data.anamnese_id),
    qtdImagens: data.qtd_imagens,
  };
}
