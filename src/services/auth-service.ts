import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type BackendUser,
} from "@/types/usuario";
import { ApiError } from "@/lib/api-client";
import { config } from "@/lib/config";
import { setStoredToken, clearStoredToken } from "@/lib/session";
import { seedUsuarios } from "@/services/mocks/seed-data";

/**
 * Fala direto com o FastAPI (fastapi-users): sem cookie, sem rota Next no
 * meio. O access_token vive só em localStorage (via lib/session.ts) e é
 * anexado pelo api-client em toda chamada autenticada — mesma fonte de
 * verdade usada pelos outros services.
 */

const SENHA_MOCK = "123456";

export type RegisterInput = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
};

async function loginMock(email: string, senha: string): Promise<Usuario | null> {
  if (senha !== SENHA_MOCK) return null;
  return seedUsuarios.find((u) => u.email === email) ?? null;
}

async function registrarMock(input: RegisterInput): Promise<Usuario> {
  return {
    id: `paciente-${crypto.randomUUID()}`,
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
    role: "paciente",
    criadoEm: new Date().toISOString(),
  };
}

async function obterAccessToken(email: string, senha: string): Promise<string> {
  const formBody = new URLSearchParams();
  formBody.append("username", email.trim().toLowerCase());
  formBody.append("password", senha);

  const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!response.ok) {
    throw new ApiError(response.status, "E-mail ou senha incorretos.");
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}

async function buscarUsuarioAtual(accessToken: string): Promise<Usuario> {
  const response = await fetch(`${config.apiBaseUrl}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Falha ao obter perfil do usuário.");
  }

  return adaptBackendUser(backendUserSchema.parse(await response.json()));
}

async function loginReal(
  email: string,
  senha: string,
): Promise<{ usuario: Usuario; accessToken: string }> {
  const accessToken = await obterAccessToken(email, senha);
  const usuario = await buscarUsuarioAtual(accessToken);
  return { usuario, accessToken };
}

async function registrarReal(
  input: RegisterInput,
): Promise<{ usuario: Usuario; accessToken?: string }> {
  const payload = {
    name: input.nome,
    email: input.email.trim().toLowerCase(),
    password: input.senha,
    phone: input.telefone,
  };

  const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    if (errorBody?.detail === "REGISTER_USER_ALREADY_EXISTS") {
      throw new ApiError(response.status, "Este e-mail já está cadastrado.");
    }
    throw new ApiError(response.status, "Não foi possível concluir o cadastro.");
  }

  const backendUser: BackendUser = await response.json();
  const usuario = adaptBackendUser(backendUser);

  // fastapi-users não loga automaticamente no registro — chama /auth/login
  // em seguida pra já sair com um access_token utilizável. Se isso falhar
  // (ex.: verificação de e-mail obrigatória no futuro), segue só com o
  // usuário criado; a pessoa loga manualmente depois.
  try {
    const accessToken = await obterAccessToken(input.email, input.senha);
    return { usuario, accessToken };
  } catch {
    return { usuario };
  }
}

export const authService = {
  async login(email: string, senha: string): Promise<Usuario> {
    if (config.apiMocking) {
      const usuario = await loginMock(email, senha);
      if (!usuario) throw new ApiError(401, "E-mail ou senha incorretos.");
      return usuarioSchema.parse(usuario);
    }

    const { usuario, accessToken } = await loginReal(email, senha);
    setStoredToken(accessToken);
    return usuarioSchema.parse(usuario);
  },

  async registrar(input: RegisterInput): Promise<Usuario> {
    if (config.apiMocking) {
      return usuarioSchema.parse(await registrarMock(input));
    }

    const { usuario, accessToken } = await registrarReal(input);
    if (accessToken) setStoredToken(accessToken);
    return usuarioSchema.parse(usuario);
  },

  async logout(): Promise<void> {
    // JWT do fastapi-users é stateless (sem blacklist) — não há o que
    // invalidar no servidor, só o token local mesmo.
    clearStoredToken();
  },
};
