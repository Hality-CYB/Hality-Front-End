import { usuarioSchema, backendUserSchema, adaptBackendUser, type Usuario } from "@/types/usuario";
import { ApiError } from "@/lib/api-client";
import { setStoredToken, clearStoredToken } from "@/lib/session";
import type { UserUpdateInput } from "@/types/auth";

/**
 * Fala com as rotas Next em app/api/auth/* (BFF), que gerenciam o cookie
 * httpOnly e orquestram as chamadas ao FastAPI.
 *
 * Também sincroniza o token em `localStorage` via `session.ts` para que
 * chamadas diretas via `apiClient` no navegador enviem o header Authorization.
 */

async function parseErro(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(response.status, body?.erro ?? "Falha na autenticação.");
}

export type RegisterInput = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
};

export const authService = {
  async login(email: string, senha: string): Promise<Usuario> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    if (!response.ok) await parseErro(response);

    const data = await response.json();
    if (data.accessToken) {
      setStoredToken(data.accessToken);
    }

    return usuarioSchema.parse(data);
  },

  async registrar(input: RegisterInput): Promise<Usuario> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) await parseErro(response);

    const data = await response.json();
    if (data.accessToken) {
      setStoredToken(data.accessToken);
    }

    return usuarioSchema.parse(data);
  },

  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearStoredToken();
    }
  },

  /**
   * Solicita o envio do e-mail de recuperação de senha.
   * Por segurança, o backend (e este BFF) sempre retornam 202 — não é
   * possível saber pelo status se o e-mail existe ou não.
   */
  async esqueciSenha(email: string): Promise<void> {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) await parseErro(response);
  },

  /**
   * Redefine a senha usando o token recebido por e-mail.
   * O token é extraído da query string `?token=...` pelo componente da página.
   */
  async redefinirSenha(token: string, novaSenha: string): Promise<void> {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, novaSenha }),
    });

    if (!response.ok) await parseErro(response);
  },

  /**
   * Busca os dados do usuário autenticado no backend.
   * Usa o `apiClient` que já injeta o header `Authorization: Bearer <token>`
   * a partir do `localStorage` (sincronizado no login).
   */
  async obterUsuarioAtual(): Promise<Usuario> {
    const { apiClient } = await import("@/lib/api-client");
    const data = await apiClient.get<unknown>("/api/v1/users/me");
    const backendUser = backendUserSchema.parse(data);
    return adaptBackendUser(backendUser);
  },

  /**
   * Atualiza nome e/ou telefone do usuário logado via PATCH /api/v1/users/me.
   * O backend espera campos do UserUpdate do fastapi-users.
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
