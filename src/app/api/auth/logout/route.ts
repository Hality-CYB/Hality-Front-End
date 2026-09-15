import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAccessToken, limparCookieSessao } from "@/lib/auth/session";

/**
 * BFF de logout: revoga o token no FastAPI (invalidação server-side)
 * e então apaga o cookie de sessão httpOnly local.
 *
 * Se o backend não estiver acessível ou não houver token na sessão,
 * limpa o cookie de qualquer forma para não deixar o usuário preso.
 */
export async function POST() {
  try {
    const accessToken = await getAccessToken();

    if (accessToken && !config.apiMocking) {
      await fetch(`${config.apiBaseUrl}/api/v1/auth/jwt/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => {
        // Falha silenciosa — o cookie local será limpo de qualquer forma
      });
    }
  } finally {
    await limparCookieSessao();
  }

  return NextResponse.json({ ok: true });
}
