import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { criarSessionToken, definirCookieSessao } from "@/lib/auth/session";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { type Usuario, type BackendUser, adaptBackendUser } from "@/types/usuario";

/**
 * Rota Next (BFF de fronteira de sessão):
 * - Roda no servidor e traduz as credenciais para o formato OAuth2 exigido
 *   pelo FastAPI-Users (application/x-www-form-urlencoded).
 * - Armazena o access_token do FastAPI e os dados de perfil no cookie httpOnly.
 * - Suporta fallback transparente para seed-data.ts quando apiMocking está ativado.
 */

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

const SENHA_MOCK = "123456";

async function loginMock(email: string, senha: string): Promise<Usuario | null> {
  if (senha !== SENHA_MOCK) return null;
  return seedUsuarios.find((u) => u.email === email) ?? null;
}

async function loginReal(
  email: string,
  senha: string,
): Promise<{ usuario: Usuario; accessToken: string }> {
  const formBody = new URLSearchParams();
  formBody.append("username", email.trim().toLowerCase());
  formBody.append("password", senha);

  const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!response.ok) {
    throw new Error("Falha no login");
  }

  const tokenData: { access_token: string; token_type: string } = await response.json();

  const userRes = await fetch(`${config.apiBaseUrl}/api/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userRes.ok) {
    throw new Error("Falha ao obter perfil do usuário");
  }

  const backendUser: BackendUser = await userRes.json();
  const usuario = adaptBackendUser(backendUser);

  return { usuario, accessToken: tokenData.access_token };
}

export async function POST(request: Request) {
  const body = credenciaisSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 400 });
  }

  try {
    let usuario: Usuario | null = null;
    let accessToken: string | undefined = undefined;

    if (config.apiMocking) {
      usuario = await loginMock(body.data.email, body.data.senha);
    } else {
      const real = await loginReal(body.data.email, body.data.senha);
      usuario = real.usuario;
      accessToken = real.accessToken;
    }

    if (!usuario) {
      return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const sessionToken = await criarSessionToken({
      id: usuario.id,
      role: usuario.role,
      accessToken,
    });
    await definirCookieSessao(sessionToken);

    return NextResponse.json({
      ...usuario,
      ...(accessToken ? { accessToken } : {}),
    });
  } catch {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
}
