import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { seedProfissionais, seedUsuarios } from "@/services/mocks/seed-data";
import { mapFrontendRoleToBackend, type Usuario, type BackendUser } from "@/types/usuario";

const usuarios = [...seedUsuarios];

/** Senha de todo usuário mockado até ele trocar pela tela "Alterar senha". */
export const SENHA_MOCK = "123456";
/** Mesmo mínimo do back (`SENHA_TAMANHO_MINIMO`). */
const SENHA_TAMANHO_MINIMO = 8;
const senhasAlteradas = new Map<string, string>();

export function senhaMockDe(usuarioId: string): string {
  return senhasAlteradas.get(usuarioId) ?? SENHA_MOCK;
}

const alterarSenhaSchema = z
  .object({ senha_atual: z.string().min(1), nova_senha: z.string().min(SENHA_TAMANHO_MINIMO) })
  .strict();
const url = (path: string) => `${config.apiBaseUrl}${path}`;

type PerfilProfissionalMock = { registro: string | null; especialidade: string | null };
const perfisProfissionais = new Map<string, PerfilProfissionalMock>(
  seedProfissionais.map((p) => [
    p.id,
    { registro: p.registroProfissional, especialidade: p.especialidade ?? null },
  ]),
);

/** Espelha `UserUpdate` do back (#93): campos fora da lista são recusados com 422. */
const atualizarPerfilSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    phone: z.string().max(20).nullable().optional(),
    profissional: z
      .object({
        registro_profissional: z.string().max(50).nullable().optional(),
        especialidade: z.string().max(100).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/**
 * Usado só por `registrarMock` (auth-service.ts) pra registrar um
 * usuário criado durante o cadastro mockado, senão `GET /users/me` logo
 * depois do registro não acharia ninguém (o usuário nunca existiu em
 * seedUsuarios, só na resposta do registro).
 */
export function adicionarUsuarioMock(usuario: Usuario): void {
  usuarios.push(usuario);
}

/**
 * O "access_token" mockado (ver MOCK_TOKEN_PREFIX em auth-service.ts) não é
 * um JWT de verdade — é só "mock-token:<usuarioId>", decodificado aqui.
 * Faz o papel do JWT no back: a identidade vem do token, nunca do payload.
 */
export function usuarioDoRequest(request: Request): Usuario | undefined {
  const auth = request.headers.get("authorization") ?? "";
  const usuarioId = auth.replace(/^Bearer mock-token:/, "");
  return usuarios.find((u) => u.id === usuarioId);
}

function paraBackendUser(usuario: Usuario): BackendUser {
  const perfil = usuario.role === "profissional" ? perfisProfissionais.get(usuario.id) : undefined;
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.nome,
    phone: usuario.telefone ?? null,
    role: mapFrontendRoleToBackend(usuario.role),
    is_active: true,
    profissional: perfil
      ? {
          registro_profissional: perfil.registro,
          especialidade: perfil.especialidade,
          vinculado_hality: false,
        }
      : null,
  };
}

export const authHandlers = [
  // Usado por RoleLayout pra descobrir quem está logado.
  http.get(url("/api/v1/users/me"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(paraBackendUser(usuario));
  }),

  http.patch(url("/api/v1/users/me"), async ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const body = atualizarPerfilSchema.safeParse(await request.json());
    if (!body.success) {
      return HttpResponse.json({ detail: "campo não permitido ou inválido" }, { status: 422 });
    }
    if (body.data.profissional && usuario.role !== "profissional") {
      return HttpResponse.json(
        { detail: "dados profissionais restritos a profissionais" },
        { status: 403 },
      );
    }

    const index = usuarios.findIndex((u) => u.id === usuario.id);
    const atualizado: Usuario = {
      ...usuario,
      ...(body.data.name !== undefined ? { nome: body.data.name } : {}),
      ...(body.data.phone !== undefined ? { telefone: body.data.phone } : {}),
    };
    usuarios[index] = atualizado;
    if (body.data.profissional) {
      const atual = perfisProfissionais.get(usuario.id) ?? { registro: null, especialidade: null };
      perfisProfissionais.set(usuario.id, {
        registro:
          body.data.profissional.registro_profissional !== undefined
            ? body.data.profissional.registro_profissional
            : atual.registro,
        especialidade:
          body.data.profissional.especialidade !== undefined
            ? body.data.profissional.especialidade
            : atual.especialidade,
      });
    }
    return HttpResponse.json(paraBackendUser(atualizado));
  }),

  // Igual ao back (#104): 400 se a senha atual não confere, 422 se o corpo é inválido.
  http.patch(url("/api/v1/users/me/senha"), async ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const body = alterarSenhaSchema.safeParse(await request.json());
    if (!body.success) {
      return HttpResponse.json({ detail: "senha inválida" }, { status: 422 });
    }
    if (body.data.senha_atual !== senhaMockDe(usuario.id)) {
      return HttpResponse.json({ detail: "senha atual inválida" }, { status: 400 });
    }
    senhasAlteradas.set(usuario.id, body.data.nova_senha);
    return new HttpResponse(null, { status: 204 });
  }),
];
