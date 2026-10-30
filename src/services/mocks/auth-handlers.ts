import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import {
  atualizarUsuarioMock,
  perfisProfissionaisMock,
  usuariosMock,
} from "@/services/mocks/mock-db";
import { mapFrontendRoleToBackend, type Usuario, type BackendUser } from "@/types/usuario";

/** Senha de todo usuário mockado até ele trocar pela tela "Alterar senha". */
export const SENHA_MOCK = "123456";
/** Mesmo mínimo do back (`SENHA_TAMANHO_MINIMO`). */
const SENHA_TAMANHO_MINIMO = 8;
const senhasAlteradas = new Map<string, string>();
const usuariosComEmailPendente = new Set<string>();
const PREFIXO_TOKEN_CONFIRMACAO_MOCK = "confirmacao-mock-";

export function tokenDeConfirmacaoMock(usuarioId: string): string {
  return `${PREFIXO_TOKEN_CONFIRMACAO_MOCK}${usuarioId}`;
}

export function marcarEmailPendenteMock(usuarioId: string): void {
  usuariosComEmailPendente.add(usuarioId);
}

export function emailPendenteDeConfirmacaoMock(usuarioId: string): boolean {
  return usuariosComEmailPendente.has(usuarioId);
}

export function senhaMockDe(usuarioId: string): string {
  return senhasAlteradas.get(usuarioId) ?? SENHA_MOCK;
}

const alterarSenhaSchema = z
  .object({ senha_atual: z.string().min(1), nova_senha: z.string().min(SENHA_TAMANHO_MINIMO) })
  .strict();
const url = (path: string) => `${config.apiBaseUrl}${path}`;

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
 * Registra cadastros públicos/administrativos na mesma base do login e do perfil.
 * A senha explícita do cadastro direto fica só no armazenamento de credenciais mock.
 */
export function adicionarUsuarioMock(usuario: Usuario, senha?: string): void {
  usuariosMock.push(usuario);
  if (senha !== undefined) senhasAlteradas.set(usuario.id, senha);
}

/** Login mockado: como o back, usuário desativado pelo admin não entra. */
export function usuarioMockParaLogin(email: string, senha: string): Usuario | null {
  const usuario = usuariosMock.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!usuario || usuario.ativo === false || senha !== senhaMockDe(usuario.id)) return null;
  return usuario;
}

/**
 * O "access_token" mockado (ver MOCK_TOKEN_PREFIX em auth-service.ts) não é
 * um JWT de verdade — é só "mock-token:<usuarioId>", decodificado aqui.
 * Faz o papel do JWT no back: a identidade vem do token, nunca do payload.
 */
export function usuarioDoRequest(request: Request): Usuario | undefined {
  const auth = request.headers.get("authorization") ?? "";
  const usuarioId = auth.replace(/^Bearer mock-token:/, "");
  return usuariosMock.find((u) => u.id === usuarioId);
}

function paraBackendUser(usuario: Usuario): BackendUser {
  const perfil =
    usuario.role === "profissional" ? perfisProfissionaisMock.get(usuario.id) : undefined;
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.nome,
    phone: usuario.telefone ?? null,
    role: mapFrontendRoleToBackend(usuario.role),
    is_active: usuario.ativo ?? true,
    profissional: perfil
      ? {
          registro_profissional: perfil.registro,
          especialidade: perfil.especialidade,
          vinculado_hality: perfil.vinculadoHality,
        }
      : null,
  };
}

const confirmarEmailSchema = z.object({ token: z.string().min(20) }).strict();
const reenviarConfirmacaoSchema = z.object({ email: z.string().email() }).strict();

export const authHandlers = [
  http.post(url("/api/v1/auth/email-verification/confirm"), async ({ request }) => {
    const body = confirmarEmailSchema.safeParse(await request.json());
    const usuarioId = body.success
      ? body.data.token.replace(PREFIXO_TOKEN_CONFIRMACAO_MOCK, "")
      : undefined;
    if (
      !body.success ||
      !body.data.token.startsWith(PREFIXO_TOKEN_CONFIRMACAO_MOCK) ||
      !usuarioId ||
      !usuariosComEmailPendente.delete(usuarioId)
    ) {
      return HttpResponse.json({ detail: "TOKEN_DE_VERIFICACAO_INVALIDO" }, { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/api/v1/auth/email-verification/resend"), async ({ request }) => {
    const body = reenviarConfirmacaoSchema.safeParse(await request.json());
    if (!body.success) {
      return HttpResponse.json({ detail: "e-mail inválido" }, { status: 422 });
    }
    return HttpResponse.json(
      {
        message:
          "Se o endereço estiver cadastrado e pendente de confirmação, enviaremos um novo link.",
      },
      { status: 202 },
    );
  }),

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

    const atualizado =
      atualizarUsuarioMock(usuario.id, {
        ...(body.data.name !== undefined ? { nome: body.data.name } : {}),
        ...(body.data.phone !== undefined ? { telefone: body.data.phone } : {}),
      }) ?? usuario;
    if (body.data.profissional) {
      const atual = perfisProfissionaisMock.get(usuario.id) ?? {
        registro: null,
        especialidade: null,
        vinculadoHality: false,
      };
      perfisProfissionaisMock.set(usuario.id, {
        vinculadoHality: atual.vinculadoHality,
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
