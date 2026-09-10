import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { roleSchema, type Role } from "@/types/usuario";

/**
 * DAL da sessão — único lugar que lê/verifica o cookie de login, pra
 * ninguém reimplementar essa checagem na mão. `import "server-only"`
 * garante que isso nunca acaba num bundle de Client Component (o build
 * quebra se tentar).
 *
 * AUTH_SECRET nunca deve ter o prefixo NEXT_PUBLIC_ — por isso é lido
 * direto daqui, não do objeto `config` compartilhado (que é importado por
 * componentes cliente também).
 */

const COOKIE_NAME = "cyb_session";
const EXPIRACAO = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado — copie .env.example pra .env");
  }
  return new TextEncoder().encode(secret);
}

export type Sessao = { id: string; role: Role };

export async function criarSessionToken(sessao: Sessao): Promise<string> {
  return new SignJWT({ role: sessao.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sessao.id)
    .setIssuedAt()
    .setExpirationTime(EXPIRACAO)
    .sign(getSecret());
}

/** Exportada separadamente do cookie pra proxy.ts poder reusar — proxy
 * lê o cookie via NextRequest.cookies, não via next/headers. */
export async function verificarSessionToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = roleSchema.safeParse(payload.role);
    if (!payload.sub || !role.success) return null;
    return { id: payload.sub, role: role.data };
  } catch {
    return null;
  }
}

/**
 * Lê e verifica a sessão a partir do cookie httpOnly. `cache()` memoiza
 * por render — várias chamadas no mesmo request não re-verificam o token
 * repetidamente.
 */
export const verifySession = cache(async (): Promise<Sessao | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarSessionToken(token);
});

export async function definirCookieSessao(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function limparCookieSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
