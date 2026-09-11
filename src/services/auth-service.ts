import { config } from "@/lib/config";
import { apiClient, ApiError } from "@/lib/api-client";
import { setStoredToken, clearStoredToken } from "@/lib/session";
import { type Usuario, type BackendUser, adaptBackendUser } from "@/types/usuario";
import type { AuthTokenResponse, AuthSession, RegisterPayload } from "@/types/auth";

type LoginArgs =
  | [email: string, senha: string]
  | [credentials: { email: string; senha?: string; password?: string }];

type RegisterInput =
  | RegisterPayload
  | {
      nome: string;
      email: string;
      senha: string;
      telefone?: string;
    };

function parseLoginError(detail: string): string {
  if (detail.includes("LOGIN_BAD_CREDENTIALS")) {
    return "E-mail ou senha incorretos.";
  }
  if (detail.includes("LOGIN_USER_NOT_VERIFIED")) {
    return "E-mail ainda não verificado.";
  }
  return "Falha na autenticação.";
}

function parseRegisterError(detail: string): string {
  if (detail.includes("REGISTER_USER_ALREADY_EXISTS")) {
    return "Este e-mail já está cadastrado.";
  }
  return "Não foi possível concluir o cadastro.";
}

export const authService = {
  async login(...args: LoginArgs): Promise<AuthSession> {
    const email = typeof args[0] === "string" ? args[0] : args[0].email;
    const password =
      typeof args[0] === "string" ? (args[1] as string) : (args[0].password ?? args[0].senha ?? "");

    const formBody = new URLSearchParams();
    formBody.append("username", email.trim().toLowerCase());
    formBody.append("password", password);

    const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, parseLoginError(errorText));
    }

    const tokenData: AuthTokenResponse = await response.json();
    setStoredToken(tokenData.access_token);

    // Carrega os dados atualizados do perfil autenticado
    const usuario = await this.getMe();

    return {
      token: tokenData.access_token,
      usuario,
    };
  },

  async registrar(input: RegisterInput): Promise<Usuario> {
    const payload: RegisterPayload =
      "nome" in input
        ? {
            name: input.nome,
            email: input.email.trim().toLowerCase(),
            password: input.senha,
            phone: input.telefone,
          }
        : {
            name: input.name,
            email: input.email.trim().toLowerCase(),
            password: input.password,
            phone: input.phone,
          };

    const response = await fetch(`${config.apiBaseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, parseRegisterError(errorText));
    }

    const backendUser: BackendUser = await response.json();
    return adaptBackendUser(backendUser);
  },

  async getMe(): Promise<Usuario> {
    const backendUser = await apiClient.get<BackendUser>("/api/v1/users/me");
    return adaptBackendUser(backendUser);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch {
      // Falha de rede no logout do servidor não impede limpeza local da sessão
    } finally {
      clearStoredToken();
    }
  },
};
