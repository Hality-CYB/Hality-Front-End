import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { criarSessionToken, definirCookieSessao } from "@/lib/auth/session";
import { type Usuario, type BackendUser, adaptBackendUser } from "@/types/usuario";

const registroSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(1),
  telefone: z.string().optional(),
});

async function registrarMock(input: z.infer<typeof registroSchema>): Promise<Usuario> {
  return {
    id: `paciente-${crypto.randomUUID()}`,
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
    role: "paciente",
    criadoEm: new Date().toISOString(),
  };
}

async function registrarReal(
  input: z.infer<typeof registroSchema>,
): Promise<{ usuario: Usuario; accessToken?: string }> {
  const payload = {
    name: input.nome,
    email: input.email.trim().toLowerCase(),
    password: input.senha,
    phone: input.telefone,
  };

  const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    if (errorBody?.detail === "REGISTER_USER_ALREADY_EXISTS") {
      throw new Error("Este e-mail já está cadastrado.");
    }
    throw new Error("Não foi possível concluir o cadastro.");
  }

  const backendUser: BackendUser = await response.json();
  const usuario = adaptBackendUser(backendUser);

  // Auto-login no FastAPI para obter access_token da nova conta
  let accessToken: string | undefined = undefined;
  try {
    const formBody = new URLSearchParams();
    formBody.append("username", input.email.trim().toLowerCase());
    formBody.append("password", input.senha);

    const loginRes = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      accessToken = loginData.access_token;
    }
  } catch {
    // Se o auto-login falhar, prossegue com o usuário criado
  }

  return { usuario, accessToken };
}

export async function POST(request: Request) {
  const body = registroSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  try {
    let usuario: Usuario;
    let accessToken: string | undefined = undefined;

    if (config.apiMocking) {
      usuario = await registrarMock(body.data);
    } else {
      const real = await registrarReal(body.data);
      usuario = real.usuario;
      accessToken = real.accessToken;
    }

    const token = await criarSessionToken({
      id: usuario.id,
      role: usuario.role,
      accessToken,
    });
    await definirCookieSessao(token);

    return NextResponse.json(
      {
        ...usuario,
        ...(accessToken ? { accessToken } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao registrar.";
    return NextResponse.json({ erro: message }, { status: 400 });
  }
}
