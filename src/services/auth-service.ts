import { apiClient } from "@/lib/api-client";
import type { AuthTokenResponse, LoginCredentials } from "@/types/auth";

/**
 * Chamadas de autenticação. Mantém a regra "services chamam o apiClient,
 * nunca fetch direto" — hooks (`use-auth.ts`) cuidam do estado/efeito e da
 * persistência do token retornado.
 */
export const authService = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthTokenResponse>("/api/v1/auth/login", credentials),
};
