/**
 * Persistência do access token do usuário autenticado no navegador.
 *
 * Só o access_token (JWT curto, 30min) mora aqui — vai no header
 * Authorization de toda chamada autenticada, lido por `api-client.ts`.
 *
 * O refresh_token NÃO tem par aqui de propósito: ele vive só num cookie
 * httpOnly setado pelo back (ver app/api/v1/endpoints/auth.py), com `path`
 * restrito às rotas de auth. JavaScript nunca consegue ler esse cookie —
 * nem `document.cookie` nem `localStorage` alcançam — então um XSS na SPA
 * rouba no máximo o access_token, que expira em 30min.
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
  return Boolean(getStoredToken());
}

export { TOKEN_STORAGE_KEY };
