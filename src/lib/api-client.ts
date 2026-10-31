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
    public segundosParaTentarDeNovo?: number,
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

type ApiRequestInit = RequestInit & { autenticada?: boolean; statusEsperado?: number };

async function request<T>(path: string, init?: ApiRequestInit, retentativa = false): Promise<T> {
  const { autenticada = true, statusEsperado, ...requestInit } = init ?? {};
  const token = autenticada ? getStoredToken() : null;
  // Com FormData (upload de arquivo) quem define o Content-Type é o
  // navegador, porque ele precisa incluir o boundary do multipart.
  const headers: Record<string, string> = {
    ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!autenticada) {
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === "authorization") delete headers[name];
    }
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...requestInit,
    headers,
    ...(!autenticada && {
      // Fluxos públicos normalmente não levam cookie. A troca do código do
      // Google é a exceção explícita: precisa receber o refresh httpOnly.
      credentials: requestInit.credentials ?? "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    }),
  });
  if (response.ok && statusEsperado !== undefined && response.status !== statusEsperado) {
    throw new ApiError(response.status, "Resposta inesperada do servidor.");
  }

  // access_token expirado: tenta renovar em silêncio uma vez só, e refaz a
  // chamada original com o token novo — quem chamou nem fica sabendo.
  if (autenticada && response.status === 401 && !retentativa) {
    const novoToken = await renovarAccessToken();
    if (novoToken) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    if (autenticada && response.status === 401) {
      clearStoredToken();
    }
    const retryAfter = response.headers.get("Retry-After");
    const seconds = retryAfter
      ? /^\d+$/.test(retryAfter)
        ? Number(retryAfter)
        : Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000)
      : undefined;
    throw new ApiError(
      response.status,
      await response.text(),
      seconds !== undefined && Number.isFinite(seconds) ? Math.max(0, seconds) : undefined,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function serializarBody(body: unknown): BodyInit | undefined {
  if (!body) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const apiClient = {
  get: <T>(path: string, init?: ApiRequestInit) => request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: serializarBody(body),
    }),
  put: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: serializarBody(body),
    }),
  patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, {
      ...init,
      method: "PATCH",
      body: serializarBody(body),
    }),
  delete: <T>(path: string, init?: ApiRequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
