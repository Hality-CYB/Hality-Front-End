import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { apiClient } from "@/lib/api-client";
import { criarSessionToken, definirCookieSessao } from "@/lib/auth/session";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { usuarioSchema, type Usuario } from "@/types/usuario";

/**
 * Rota Next (não `services/`) de propósito — glue de fronteira de sessão,
 * não lógica de negócio. Roda no servidor, então o service worker do MSW
 * (que só intercepta fetch do navegador) nunca veria essa chamada de
 * qualquer forma; por isso o modo mock é tratado aqui direto contra
 * seed-data.ts, sem passar pelo apiClient.
 *
 * Senha "123456" pra todo mundo é só conveniência de dev, igual Design/
 * fazia — nenhuma senha de verdade existe ainda porque o back-end não
 * tem endpoint de auth.
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

async function loginReal(email: string, senha: string): Promise<Usuario> {
  const data = await apiClient.post<unknown>("/api/v1/auth/login", { email, senha });
  return usuarioSchema.parse(data);
}

export async function POST(request: Request) {
  const body = credenciaisSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 400 });
  }

  const usuario = config.apiMocking
    ? await loginMock(body.data.email, body.data.senha)
    : await loginReal(body.data.email, body.data.senha).catch(() => null);

  if (!usuario) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = await criarSessionToken({ id: usuario.id, role: usuario.role });
  await definirCookieSessao(token);

  return NextResponse.json(usuario);
}
