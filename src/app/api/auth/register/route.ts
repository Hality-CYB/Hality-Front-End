import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { apiClient } from "@/lib/api-client";
import { criarSessionToken, definirCookieSessao } from "@/lib/auth/session";
import { usuarioSchema, type Usuario } from "@/types/usuario";

/**
 * Mesmo padrão de login/route.ts. Igual Design/'s handleRegister, sempre
 * cria um paciente e já loga — sem persistir de verdade (reinicia o
 * processo, perde), mas ninguém verifica isso hoje. RF04-06 (registro
 * de profissional/admin, vínculo, consentimento LGPD em duas partes)
 * ficam pra quando a tela de registro virar trabalho de verdade — essa
 * aqui só porta o visual e o comportamento que Design/ já tinha.
 */

const registroSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(1),
});

async function registrarMock(input: z.infer<typeof registroSchema>): Promise<Usuario> {
  return {
    id: `paciente-${crypto.randomUUID()}`,
    nome: input.nome,
    email: input.email,
    role: "paciente",
    criadoEm: new Date().toISOString(),
  };
}

async function registrarReal(input: z.infer<typeof registroSchema>): Promise<Usuario> {
  const data = await apiClient.post<unknown>("/api/v1/auth/registro", input);
  return usuarioSchema.parse(data);
}

export async function POST(request: Request) {
  const body = registroSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  const usuario = config.apiMocking
    ? await registrarMock(body.data)
    : await registrarReal(body.data);

  const token = await criarSessionToken({ id: usuario.id, role: usuario.role });
  await definirCookieSessao(token);

  return NextResponse.json(usuario, { status: 201 });
}
