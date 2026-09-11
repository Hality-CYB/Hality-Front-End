import type { Usuario } from "@/types/usuario";

/**
 * Contratos de autenticação alinhados com o FastAPI-Users no backend.
 */

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
};

export type AuthSession = {
  token: string;
  usuario: Usuario;
};
