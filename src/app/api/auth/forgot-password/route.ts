import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";

/**
 * BFF: solicita o envio de e-mail de recuperação de senha ao FastAPI.
 * Em modo mock, retorna 202 imediatamente (nenhum e-mail é enviado).
 * Em produção, encaminha para POST /api/v1/auth/forgot-password do backend.
 */

const esquemaEsqueciSenha = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = esquemaEsqueciSenha.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  }

  if (config.apiMocking) {
    // Em modo mock, simula sucesso sem fazer chamada real
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.data.email }),
    });

    // fastapi-users retorna 202 se o e-mail existe, 422 se inválido.
    // Por segurança (evitar enumeração de usuários), sempre retornamos 202
    // para o cliente, mesmo que o backend retorne 4xx.
    if (res.status === 422) {
      return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível enviar o e-mail de recuperação." },
      { status: 502 },
    );
  }
}
