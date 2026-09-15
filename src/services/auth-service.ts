import { backendUserSchema, adaptBackendUser, type Usuario } from "@/types/usuario";
import { ApiError } from "@/lib/api-client";
import { config } from "@/lib/config";
import type { UserUpdateInput } from "@/types/auth";

/**
 * Fala diretamente com o FastAPI — sem BFF intermediário.
 *
 * A sessão é gerenciada exclusivamente via cookie `fastapiusersauth`
 * emitido pelo FastAPI (httpOnly, sameSite: lax, Max-Age = 24h).
 * `credentials: "include"` garante que o navegador envie o cookie
 * automaticamente em todas as requisições autenticadas.
 */

const api = config.apiBaseUrl;

async function parseErro(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  const detail = body?.detail ?? body?.erro;
  throw new ApiError(
    response.status,
    typeof detail === "string" ? detail : "Falha na autenticação.",
  );
}

export type RegisterInput = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
};

export const authService = {
  /**
   * Realiza login via OAuth2 password flow (x-www-form-urlencoded).
   * O FastAPI responde com Set-Cookie: fastapiusersauth.
   * Em seguida, busca os dados do usuário logado via GET /api/v1/users/me.
   */
  async login(email: string, senha: string): Promise<Usuario> {
    const formBody = new URLSearchParams();
    formBody.append("username", email.trim().toLowerCase());
    formBody.append("password", senha);

    const loginRes = await fetch(`${api}/api/v1/auth/jwt/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
      credentials: "include",
    });

    if (!loginRes.ok) await parseErro(loginRes);

    return authService.obterUsuarioAtual();
  },

  /**
   * Registra novo usuário e, em seguida, faz login automático.
   * Se o login falhar após o registro, lança erro explícito — nenhuma
   * sessão fantasma é criada.
   */
  async registrar(input: RegisterInput): Promise<Usuario> {
    const registerRes = await fetch(`${api}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.nome,
        email: input.email.trim().toLowerCase(),
        password: input.senha,
        phone: input.telefone,
      }),
      credentials: "include",
    });

    if (!registerRes.ok) {
      const errorBody = await registerRes.json().catch(() => null);
      if (errorBody?.detail === "REGISTER_USER_ALREADY_EXISTS") {
        throw new ApiError(409, "Este e-mail já está cadastrado.");
      }
      throw new ApiError(registerRes.status, "Não foi possível concluir o cadastro.");
    }

    // Auto-login obrigatório — se falhar, propaga o erro e impede sessão sem autenticação
    return authService.login(input.email, input.senha);
  },

  /**
   * Revoga a sessão no FastAPI. O backend apaga o cookie fastapiusersauth
   * via Set-Cookie com Max-Age=0.
   */
  async logout(): Promise<void> {
    await fetch(`${api}/api/v1/auth/jwt/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  /**
   * Solicita o envio do e-mail de recuperação de senha.
   * O backend retorna sempre 202 — não é possível saber se o e-mail existe.
   */
  async esqueciSenha(email: string): Promise<void> {
    const res = await fetch(`${api}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    // 202 = e-mail enviado (ou não, por segurança o backend não diferencia)
    if (res.status !== 202 && !res.ok) await parseErro(res);
  },

  /**
   * Redefine a senha usando o token recebido por e-mail.
   * O token vem na query string ?token=... da página redefinir-senha.
   */
  async redefinirSenha(token: string, novaSenha: string): Promise<void> {
    const res = await fetch(`${api}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: novaSenha }),
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.detail === "RESET_PASSWORD_BAD_TOKEN") {
        throw new ApiError(400, "Link de recuperação inválido ou expirado.");
      }
      if (body?.detail === "RESET_PASSWORD_INVALID_PASSWORD") {
        throw new ApiError(400, "A senha não atende aos requisitos de segurança.");
      }
      await parseErro(res);
    }
  },

  /**
   * Busca os dados do usuário autenticado.
   * O cookie fastapiusersauth é enviado automaticamente pelo navegador.
   */
  async obterUsuarioAtual(): Promise<Usuario> {
    const { apiClient } = await import("@/lib/api-client");
    const data = await apiClient.get<unknown>("/api/v1/users/me");
    const backendUser = backendUserSchema.parse(data);
    return adaptBackendUser(backendUser);
  },

  /**
   * Atualiza nome e/ou telefone do usuário logado via PATCH /api/v1/users/me.
   */
  async atualizarPerfil(dados: UserUpdateInput): Promise<Usuario> {
    const payload: Record<string, string | undefined> = {};
    if (dados.nome !== undefined) payload["name"] = dados.nome;
    if (dados.telefone !== undefined) payload["phone"] = dados.telefone;

    const { apiClient } = await import("@/lib/api-client");
    const data = await apiClient.patch<unknown>("/api/v1/users/me", payload);
    const backendUser = backendUserSchema.parse(data);
    return adaptBackendUser(backendUser);
  },
};
