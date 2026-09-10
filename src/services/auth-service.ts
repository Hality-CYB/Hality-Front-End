import { usuarioSchema, type Usuario } from "@/types/usuario";
import { ApiError } from "@/lib/api-client";

/**
 * Fala com as rotas Next em app/api/auth/*, não com o back-end externo —
 * por isso usa `fetch` direto (mesma origem) em vez de `apiClient`, que é
 * fixo em `config.apiBaseUrl` (o FastAPI).
 */

async function parseErro(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(response.status, body?.erro ?? "Falha na autenticação.");
}

export const authService = {
  async login(email: string, senha: string): Promise<Usuario> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    if (!response.ok) await parseErro(response);
    return usuarioSchema.parse(await response.json());
  },

  async registrar(input: { nome: string; email: string; senha: string }): Promise<Usuario> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) await parseErro(response);
    return usuarioSchema.parse(await response.json());
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
  },
};
