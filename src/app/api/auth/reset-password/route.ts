import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";

/**
 * BFF: recebe o token do link de e-mail e a nova senha, repassa ao backend.
 * POST /api/v1/auth/reset-password (fastapi-users) exige: { token, password }.
 *
 * Em modo mock, simula sucesso sem chamar o backend.
 */

const esquemaRedefinirSenha = z.object({
  token: z.string().min(1, "Token de recuperação inválido."),
  novaSenha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export async function POST(request: Request) {
  const body = esquemaRedefinirSenha.safeParse(await request.json());
  if (!body.success) {
    const primeiro = body.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json({ erro: primeiro }, { status: 400 });
  }

  if (config.apiMocking) {
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: body.data.token,
        password: body.data.novaSenha,
      }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => null);

      // fastapi-users retorna strings específicas no campo `detail`
      if (detail?.detail === "RESET_PASSWORD_BAD_TOKEN") {
        return NextResponse.json(
          { erro: "Link de recuperação inválido ou expirado." },
          { status: 400 },
        );
      }
      if (detail?.detail === "RESET_PASSWORD_INVALID_PASSWORD") {
        return NextResponse.json(
          { erro: "A senha não atende aos requisitos de segurança." },
          { status: 400 },
        );
      }

      return NextResponse.json({ erro: "Não foi possível redefinir a senha." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { erro: "Erro ao conectar com o servidor. Tente novamente." },
      { status: 502 },
    );
  }
}
