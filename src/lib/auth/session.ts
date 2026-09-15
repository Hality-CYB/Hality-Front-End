import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { roleSchema, type Role } from "@/types/usuario";

/**
 * DAL da sessão — lê e verifica o cookie `fastapiusersauth` emitido
 * diretamente pelo FastAPI (fastapi-users com CookieTransport).
 *
 * Não há mais cookie próprio do Next.js nem JWT assinado pelo front.
 * `import "server-only"` garante que este módulo nunca acabe num bundle
 * de Client Component.
 *
 * O segredo deve ser o mesmo configurado no backend (SECRET_KEY do .env).
 */

export const COOKIE_NAME = "fastapiusersauth";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado — copie .env.example para .env");
  }
  return new TextEncoder().encode(secret);
}

export type Sessao = { id: string; role: Role };

/**
 * Lê e verifica a sessão a partir do cookie `fastapiusersauth` emitido
 * pelo FastAPI. `cache()` memoiza por render — várias chamadas no mesmo
 * request não re-verificam o token repetidamente.
 */
export const verifySession = cache(async (): Promise<Sessao | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarSessionToken(token);
});

export async function verificarSessionToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = roleSchema.safeParse(payload["role"]);
    if (!payload.sub || !role.success) return null;
    return { id: payload.sub, role: role.data };
  } catch {
    return null;
  }
}
