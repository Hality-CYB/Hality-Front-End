import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verificarSessionToken } from "@/lib/auth/session";
import type { Role } from "@/types/usuario";

/**
 * NÃO é middleware.ts — o Next 16 renomeou Middleware pra Proxy (mesma
 * funcionalidade). Gate rápido e otimista por prefixo de rota; não é a
 * fronteira de segurança de verdade (ver o comentário em
 * app/<role>/layout.tsx) — só evita o flash de uma rota errada antes do
 * layout confirmar a sessão no servidor.
 */

const PREFIXO_PARA_ROLE: Record<string, Role> = {
  "/paciente": "paciente",
  "/profissional": "profissional",
  "/admin": "admin",
};

const ROTAS_PUBLICAS_AUTH = ["/login", "/registro"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const sessao = token ? await verificarSessionToken(token) : null;

  // Se já está logado e acessa /login ou /registro, manda direto pra tela do perfil
  if (sessao && ROTAS_PUBLICAS_AUTH.includes(pathname)) {
    return NextResponse.redirect(new URL(`/${sessao.role}`, request.url));
  }

  const prefixo = Object.keys(PREFIXO_PARA_ROLE).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!prefixo) return NextResponse.next();

  if (!sessao) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (sessao.role !== PREFIXO_PARA_ROLE[prefixo]) {
    return NextResponse.redirect(new URL(`/${sessao.role}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/paciente/:path*", "/profissional/:path*", "/admin/:path*", "/login", "/registro"],
};
