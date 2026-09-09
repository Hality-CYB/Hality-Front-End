/**
 * Persistência da sessão do paciente autenticado.
 *
 * O token emitido no login fica em `localStorage` e é lido por
 * `api-client.ts` para ser anexado (Bearer) em toda chamada às demais
 * rotas da API — não é preciso repassar o token manualmente em cada
 * `service`.
 */

const TOKEN_STORAGE_KEY = "hality:access_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function hasActiveSession(): boolean {
  return getStoredToken() !== null;
}
