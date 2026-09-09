import { config } from "@/lib/config";
import { clearStoredToken, getStoredToken } from "@/lib/session";

/**
 * Cliente HTTP fino sobre `fetch`, único ponto do frontend que conhece a
 * URL base da API. Os `services/` chamam este cliente — nunca `fetch`
 * diretamente — para manter a base URL e o tratamento de erro num só lugar.
 *
 * O token emitido em `auth-service.login` é lido daqui (via `session.ts`) e
 * anexado como `Authorization: Bearer <token>` em toda requisição — é assim
 * que o token de login é "consumido por todas as demais rotas".
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    // Sessão expirada/inválida: limpa o token para forçar novo login.
    if (response.status === 401) {
      clearStoredToken();
    }
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
