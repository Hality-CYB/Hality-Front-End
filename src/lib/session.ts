/**
 * Utilitários de sessão no lado cliente.
 *
 * A autenticação é gerenciada exclusivamente via cookie `fastapiusersauth`
 * emitido pelo FastAPI (httpOnly, sameSite: lax). Não há mais token
 * armazenado em localStorage — este módulo provê apenas helpers que outros
 * módulos possam importar sem quebrar contratos existentes.
 */

export function hasActiveSession(): boolean {
  // Com cookie httpOnly não é possível ler o token via JS.
  // A verificação real de sessão é feita no servidor (proxy.ts)
  // ou via useCurrentUser() que chama GET /api/v1/users/me.
  // Este helper retorna true para não bloquear o redirect client-side
  // — o proxy.ts ou o servidor garantem a proteção real.
  return typeof document !== "undefined" && document.cookie.includes("fastapiusersauth");
}
