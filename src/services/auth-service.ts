import { usuarioSchema, type Usuario } from "@/types/usuario";
import { ApiError } from "@/lib/api-client";
import { setStoredToken, clearStoredToken } from "@/lib/session";

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
};
