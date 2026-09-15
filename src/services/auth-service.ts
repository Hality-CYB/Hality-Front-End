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
 * Fala direto com o FastAPI (fastapi-users): sem BFF do Next no meio.
 *
 * access_token (JWT curto) vai em `localStorage`, anexado pelo api-client
 * em toda chamada autenticada. refresh_token NUNCA passa por aqui como
 * string manipulável — o back seta ele direto num cookie httpOnly na
 * resposta de login/registro (por isso `credentials: "include"` em toda
 * chamada de auth: sem isso o navegador nem recebe nem reenvia esse
 * cookie). JavaScript não tem como ler nem guardar o que nunca vê.
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

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
  } catch {
    // Falha de rede (back fora do ar, CORS etc.) — sem isso, o erro cru do
    // fetch ("Failed to fetch") vaza direto pra tela de login.
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }

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

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }

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
  // em seguida pra já sair com um access_token utilizável (e o cookie de
  // refresh setado). Se isso falhar (ex.: verificação de e-mail obrigatória
  // no futuro), segue só com o usuário criado; a pessoa loga manualmente.
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
    if (!config.apiMocking) {
      try {
        // Encerra a sessão de verdade no back (apaga o refresh_token do
        // banco e o cookie) — o cookie viaja sozinho via credentials:
        // "include", não tem nada pra esse código ler ou mandar à mão. Se
        // isso falhar (back fora do ar), limpa local mesmo assim.
        await fetch(`${config.apiBaseUrl}/api/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Sem back, sem problema — segue só limpando local.
      }
    }
    clearStoredToken();
  },
};
