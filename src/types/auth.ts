import type { Usuario } from "@/types/usuario";

export type LoginCredentials = {
  email: string;
  senha?: string;
  password?: string;
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type AuthSession = {
  token: string;
  usuario: Usuario;
};
