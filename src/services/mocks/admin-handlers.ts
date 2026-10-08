import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import {
  CLASSIFICACAO_ID_POR_NIVEL,
  atualizarUsuarioMock,
  classificacaoResumo,
  conteudosMock,
  criarVinculoMock,
  diagnosticosMock,
  nomeDoUsuario,
  pacientesMock,
  paginar,
  perfisProfissionaisMock,
  usuariosMock,
  vinculosMock,
  idNumerico,
  type VinculoMock,
} from "@/services/mocks/mock-db";
import { CATEGORIAS_DICA, type BackendConteudoAdmin } from "@/types/dica";
import { CODIGO_POR_NIVEL, type Diagnostico } from "@/types/diagnostico";
import type { Usuario } from "@/types/usuario";

/**
 * Espelho das rotas `/admin/*` do back (#94 usuários, #95 vínculos, #96
 * diagnósticos e o CRUD de conteúdos). Tudo exige papel admin.
 */

const url = (path: string) => `${config.apiBaseUrl}${path}`;
const SENHA_TAMANHO_MINIMO = 8;
const roleSchema = z.enum(["paciente", "profissional", "admin"]);

function exigirAdmin(request: Request): Usuario | Response {
  const usuario = usuarioDoRequest(request);
  if (!usuario) return new HttpResponse(null, { status: 401 });
  if (usuario.role !== "admin") {
    return HttpResponse.json({ detail: "acesso restrito a administradores" }, { status: 403 });
  }
  return usuario;
}

function paginacao(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    params,
    pagina: Number(params.get("pagina") ?? 1),
    limite: Number(params.get("limite") ?? 20),
  };
}

// --- Usuários ---

function paraAdminUsuario(usuario: Usuario) {
  const perfil = perfisProfissionaisMock.get(usuario.id);
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone ?? null,
    role: usuario.role,
    ativo: usuario.ativo ?? true,
    created_at: usuario.criadoEm ?? new Date(0).toISOString(),
    profissional:
      usuario.role === "profissional"
        ? {
            registro_profissional: perfil?.registro ?? null,
            especialidade: perfil?.especialidade ?? null,
            vinculado_hality: perfil?.vinculadoHality ?? false,
          }
        : null,
  };
}

const criarUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(255),
    email: z.email(),
    telefone: z.string().max(20).nullable().optional(),
    role: roleSchema,
    senha: z.string().min(SENHA_TAMANHO_MINIMO),
    profissional: z
      .object({
        registro_profissional: z.string().max(50).nullable().optional(),
        especialidade: z.string().max(100).nullable().optional(),
        vinculado_hality: z.boolean().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()
  .refine((b) => !b.profissional || b.role === "profissional");

const atualizarUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(255).optional(),
    telefone: z.string().max(20).nullable().optional(),
    ativo: z.boolean().optional(),
    role: roleSchema.optional(),
  })
  .strict();

const atualizarProfissionalSchema = z
  .object({
    registro_profissional: z.string().max(50).nullable().optional(),
    especialidade: z.string().max(100).nullable().optional(),
    vinculado_hality: z.boolean().optional(),
  })
  .strict();

function adminsAtivos(excetoId: string) {
  return usuariosMock.filter((u) => u.role === "admin" && u.ativo !== false && u.id !== excetoId);
}

// --- Vínculos ---

function paraAdminVinculo(v: VinculoMock) {
  return {
    id: v.id,
    paciente_id: v.pacienteId,
    paciente_nome: nomeDoUsuario(v.pacienteId) ?? "",
    profissional_id: v.profissionalId,
    profissional_nome: nomeDoUsuario(v.profissionalId) ?? "",
    data_vinculo: v.vinculadoEm,
    ativo: v.ativo,
    encerrado_em: v.encerradoEm,
  };
}

// --- Diagnósticos ---

/** Como o back do admin: a classificação é a da IA, não a revisada. */
function paraAdminDiagnosticoItem(d: Diagnostico) {
  return {
    id: idNumerico(d.id),
    paciente_id: d.pacienteId ?? "",
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao: classificacaoResumo(d.nivel),
    tem_revisao: !!d.revisadoPor,
  };
}

// --- Conteúdos ---

const categoriaSchema = z.enum(Object.keys(CATEGORIAS_DICA) as [string, ...string[]]);
const camposConteudo = {
  titulo: z.string().min(1).max(255),
  categoria: categoriaSchema,
  conteudo: z.object({ itens: z.array(z.object({ tipo: z.string() }).loose()).min(1) }).strict(),
  classificacao_ids: z.array(z.number()),
  aparece_na_home: z.boolean(),
  status: z.enum(["rascunho", "publicado"]),
  ordem: z.number().int().min(0),
};
const criarConteudoSchema = z
  .object({
    ...camposConteudo,
    classificacao_ids: camposConteudo.classificacao_ids.default([]),
    aparece_na_home: camposConteudo.aparece_na_home.default(false),
    status: camposConteudo.status.default("rascunho"),
    ordem: camposConteudo.ordem.default(0),
  })
  .strict();
const atualizarConteudoSchema = z.object(camposConteudo).partial().strict();

const classificacoesValidas = new Set(Object.values(CLASSIFICACAO_ID_POR_NIVEL));

export const adminHandlers = [
  http.get(url("/api/v1/admin/usuarios"), ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const { params, pagina, limite } = paginacao(request);
    const role = params.get("role");
    const ativo = params.get("ativo");
    const busca = params.get("busca")?.trim().toLowerCase();
    const filtrados = usuariosMock
      .filter((u) => !role || u.role === role)
      .filter((u) => ativo === null || String(u.ativo ?? true) === ativo)
      .filter(
        (u) =>
          !busca || u.nome.toLowerCase().includes(busca) || u.email.toLowerCase().includes(busca),
      )
      // Mesma ordem do back: por nome.
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return HttpResponse.json(paginar(filtrados.map(paraAdminUsuario), pagina, limite));
  }),

  http.get(url("/api/v1/admin/usuarios/:id"), ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const usuario = usuariosMock.find((u) => u.id === params.id);
    if (!usuario) return HttpResponse.json({ detail: "usuário não encontrado" }, { status: 404 });
    return HttpResponse.json(paraAdminUsuario(usuario));
  }),

  http.post(url("/api/v1/admin/usuarios"), async ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const body = criarUsuarioSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    const email = body.data.email.toLowerCase();
    if (usuariosMock.some((u) => u.email.toLowerCase() === email)) {
      return HttpResponse.json({ detail: "e-mail já cadastrado" }, { status: 409 });
    }
    const novo: Usuario = {
      id: `${body.data.role}-${crypto.randomUUID()}`,
      nome: body.data.nome,
      email: body.data.email,
      telefone: body.data.telefone ?? null,
      role: body.data.role,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    usuariosMock.push(novo);
    if (novo.role === "paciente") {
      pacientesMock.push({
        ...novo,
        role: "paciente",
        telefone: novo.telefone ?? "",
        consentimentoDadosSaude: { aceito: false },
        consentimentoTreinamentoIA: { aceito: false },
      });
    }
    if (novo.role === "profissional") {
      perfisProfissionaisMock.set(novo.id, {
        registro: body.data.profissional?.registro_profissional ?? null,
        especialidade: body.data.profissional?.especialidade ?? null,
        vinculadoHality: body.data.profissional?.vinculado_hality ?? false,
      });
    }
    return HttpResponse.json(paraAdminUsuario(novo), { status: 201 });
  }),

  http.patch(url("/api/v1/admin/usuarios/:id"), async ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const usuario = usuariosMock.find((u) => u.id === params.id);
    if (!usuario) return HttpResponse.json({ detail: "usuário não encontrado" }, { status: 404 });
    const body = atualizarUsuarioSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });

    const deixaDeSerAdminAtivo =
      usuario.role === "admin" &&
      (body.data.ativo === false || (body.data.role && body.data.role !== "admin"));
    if (deixaDeSerAdminAtivo && adminsAtivos(usuario.id).length === 0) {
      return HttpResponse.json(
        { detail: "é necessário manter ao menos um administrador ativo" },
        { status: 409 },
      );
    }
    const atualizado = atualizarUsuarioMock(usuario.id, {
      ...(body.data.nome !== undefined ? { nome: body.data.nome } : {}),
      ...(body.data.telefone !== undefined ? { telefone: body.data.telefone } : {}),
      ...(body.data.ativo !== undefined ? { ativo: body.data.ativo } : {}),
      ...(body.data.role !== undefined ? { role: body.data.role } : {}),
    });
    return HttpResponse.json(paraAdminUsuario(atualizado!));
  }),

  http.patch(url("/api/v1/admin/profissionais/:id"), async ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const usuario = usuariosMock.find((u) => u.id === params.id && u.role === "profissional");
    if (!usuario) {
      return HttpResponse.json({ detail: "profissional não encontrado" }, { status: 404 });
    }
    const body = atualizarProfissionalSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    const atual = perfisProfissionaisMock.get(usuario.id);
    perfisProfissionaisMock.set(usuario.id, {
      registro:
        body.data.registro_profissional !== undefined
          ? body.data.registro_profissional
          : (atual?.registro ?? null),
      especialidade:
        body.data.especialidade !== undefined
          ? body.data.especialidade
          : (atual?.especialidade ?? null),
      vinculadoHality: body.data.vinculado_hality ?? atual?.vinculadoHality ?? false,
    });
    return HttpResponse.json(paraAdminUsuario(usuario));
  }),

  http.get(url("/api/v1/admin/vinculos"), ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const { params, pagina, limite } = paginacao(request);
    const pacienteId = params.get("paciente_id");
    const profissionalId = params.get("profissional_id");
    const ativo = params.get("ativo");
    const filtrados = vinculosMock
      .filter((v) => !pacienteId || v.pacienteId === pacienteId)
      .filter((v) => !profissionalId || v.profissionalId === profissionalId)
      .filter((v) => ativo === null || String(v.ativo) === ativo)
      .sort((a, b) => b.vinculadoEm.localeCompare(a.vinculadoEm));
    return HttpResponse.json(paginar(filtrados.map(paraAdminVinculo), pagina, limite));
  }),

  http.post(url("/api/v1/admin/vinculos"), async ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const body = z
      .object({ paciente_id: z.string(), profissional_id: z.string() })
      .strict()
      .safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    const { paciente_id: pacienteId, profissional_id: profissionalId } = body.data;
    const paciente = usuariosMock.find((u) => u.id === pacienteId);
    const profissional = usuariosMock.find((u) => u.id === profissionalId);
    if (paciente?.role !== "paciente" || paciente.ativo === false) {
      return HttpResponse.json({ detail: "paciente inválido" }, { status: 422 });
    }
    if (profissional?.role !== "profissional" || profissional.ativo === false) {
      return HttpResponse.json({ detail: "profissional inválido" }, { status: 422 });
    }
    const existente = vinculosMock.find(
      (v) => v.pacienteId === pacienteId && v.profissionalId === profissionalId,
    );
    if (existente?.ativo) {
      return HttpResponse.json(
        { detail: "já existe vínculo ativo para este par" },
        { status: 409 },
      );
    }
    // Como o back: um vínculo encerrado do mesmo par é reativado, não duplicado.
    if (existente) {
      existente.ativo = true;
      existente.encerradoEm = null;
      existente.vinculadoEm = new Date().toISOString();
      return HttpResponse.json(paraAdminVinculo(existente), { status: 201 });
    }
    return HttpResponse.json(paraAdminVinculo(criarVinculoMock(pacienteId, profissionalId)), {
      status: 201,
    });
  }),

  http.delete(url("/api/v1/admin/vinculos/:id"), ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const vinculo = vinculosMock.find((v) => v.id === Number(params.id));
    if (!vinculo || !vinculo.ativo) {
      return HttpResponse.json({ detail: "vínculo não encontrado" }, { status: 404 });
    }
    vinculo.ativo = false;
    vinculo.encerradoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(url("/api/v1/admin/diagnosticos"), ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const { params, pagina, limite } = paginacao(request);
    const pacienteId = params.get("paciente_id");
    const classificacao = params.get("classificacao");
    const status = params.get("status");
    const inicio = params.get("data_inicio");
    const fim = params.get("data_fim");
    const ordem = params.get("ordem") ?? "data_desc";
    const filtrados = diagnosticosMock
      .filter((d) => !pacienteId || d.pacienteId === pacienteId)
      .filter(
        (d) => !classificacao || (d.nivel !== null && CODIGO_POR_NIVEL[d.nivel] === classificacao),
      )
      .filter((d) => !status || d.status === status)
      .filter((d) => !inicio || d.criadoEm.slice(0, 10) >= inicio)
      .filter((d) => !fim || d.criadoEm.slice(0, 10) <= fim)
      .sort((a, b) =>
        ordem === "data_asc"
          ? a.criadoEm.localeCompare(b.criadoEm)
          : b.criadoEm.localeCompare(a.criadoEm),
      );
    return HttpResponse.json(paginar(filtrados.map(paraAdminDiagnosticoItem), pagina, limite));
  }),

  http.get(url("/api/v1/admin/diagnosticos/:id"), ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const d = diagnosticosMock.find((x) => idNumerico(x.id) === Number(params.id));
    if (!d) return HttpResponse.json({ detail: "diagnóstico não encontrado" }, { status: 404 });
    return HttpResponse.json({
      ...paraAdminDiagnosticoItem(d),
      erro: d.status === "falha" ? "falha simulada no mock" : null,
      automatica: {
        classificacao: classificacaoResumo(d.nivel),
        escala_saburra: null,
        confianca_ia: d.confiancaIA === undefined ? null : d.confiancaIA / 100,
      },
      revisao:
        d.revisadoPor && d.revisadoEm
          ? {
              profissional_revisor_id: d.revisadoPor,
              data_revisao: d.revisadoEm,
              observacoes: null,
            }
          : null,
      dataset: { disponivel: false, motivo: "indisponível até a definição do dataset" },
      anamnese_id: idNumerico(d.anamneseId ?? "0"),
      qtd_imagens: 1,
    });
  }),

  http.get(url("/api/v1/admin/conteudos"), ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    return HttpResponse.json([...conteudosMock].sort((a, b) => a.ordem - b.ordem));
  }),

  http.get(url("/api/v1/admin/conteudos/:id"), ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const conteudo = conteudosMock.find((c) => c.id === Number(params.id));
    if (!conteudo) return HttpResponse.json({ detail: "conteúdo não encontrado" }, { status: 404 });
    return HttpResponse.json(conteudo);
  }),

  http.post(url("/api/v1/admin/conteudos"), async ({ request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const body = criarConteudoSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    if (body.data.classificacao_ids.some((id) => !classificacoesValidas.has(id))) {
      return HttpResponse.json({ detail: "classificação não encontrada" }, { status: 400 });
    }
    const agora = new Date().toISOString();
    const publicado = body.data.status === "publicado";
    const novo: BackendConteudoAdmin = {
      ...(body.data as Omit<BackendConteudoAdmin, "id" | "created_at" | "updated_at">),
      id: Math.max(0, ...conteudosMock.map((c) => c.id)) + 1,
      created_at: agora,
      updated_at: agora,
      criado_por_id: admin.id,
      atualizado_por_id: admin.id,
      publicado_por_id: publicado ? admin.id : null,
      publicado_em: publicado ? agora : null,
    };
    conteudosMock.push(novo);
    return HttpResponse.json(novo, { status: 201 });
  }),

  http.patch(url("/api/v1/admin/conteudos/:id"), async ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const index = conteudosMock.findIndex((c) => c.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json({ detail: "conteúdo não encontrado" }, { status: 404 });
    }
    const body = atualizarConteudoSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    const atual = conteudosMock[index]!;
    const agora = new Date().toISOString();
    // Mesma regra do back: publicar registra quem e quando; voltar a rascunho limpa.
    const publicacao =
      body.data.status === "publicado" && atual.status !== "publicado"
        ? { publicado_por_id: admin.id, publicado_em: agora }
        : body.data.status === "rascunho"
          ? { publicado_por_id: null, publicado_em: null }
          : {};
    const atualizado = {
      ...atual,
      ...(body.data as Partial<BackendConteudoAdmin>),
      ...publicacao,
      updated_at: agora,
      atualizado_por_id: admin.id,
    };
    conteudosMock[index] = atualizado;
    return HttpResponse.json(atualizado);
  }),

  http.delete(url("/api/v1/admin/conteudos/:id"), ({ params, request }) => {
    const admin = exigirAdmin(request);
    if (admin instanceof Response) return admin;
    const index = conteudosMock.findIndex((c) => c.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json({ detail: "conteúdo não encontrado" }, { status: 404 });
    }
    conteudosMock.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
