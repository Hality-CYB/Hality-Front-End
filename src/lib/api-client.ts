import { config } from "@/lib/config";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/session";

/**
 * Cliente HTTP fino sobre `fetch`, único ponto do frontend que conhece a
 * URL base da API. Os `services/` chamam este cliente — nunca `fetch`
 * diretamente — para manter a base URL e o tratamento de erro num só lugar.
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

/**
 * Promise compartilhada entre chamadas paralelas que tomem 401 ao mesmo
 * tempo — dispara UM único POST /auth/refresh; as outras esperam essa
 * mesma promise em vez de cada uma tentar renovar por conta própria.
 *
 * Sem corpo, sem header manual: o refresh_token vive num cookie httpOnly
 * que o navegador anexa sozinho (por isso `credentials: "include"` — sem
 * isso o fetch cross-origin não manda nem recebe esse cookie).
 */
let refreshEmAndamento: Promise<string | null> | null = null;

async function renovarAccessToken(): Promise<string | null> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = (async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          clearStoredToken();
          return null;
        }

        const data: { access_token: string } = await response.json();
        setStoredToken(data.access_token);
        return data.access_token;
      } catch {
        // Rede fora do ar, CORS etc. — trata como "não deu pra renovar" e
        // deixa o chamador cair no fluxo normal de erro do 401 original,
        // em vez de vazar uma exceção crua de fetch.
        return null;
      }
    })().finally(() => {
      refreshEmAndamento = null;
    });
  }
  return refreshEmAndamento;
}

async function request<T>(path: string, init?: RequestInit, retentativa = false): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  // access_token expirado: tenta renovar em silêncio uma vez só, e refaz a
  // chamada original com o token novo — quem chamou nem fica sabendo.
  if (response.status === 401 && !retentativa) {
    const novoToken = await renovarAccessToken();
    if (novoToken) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
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
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "DELETE" }),
};
