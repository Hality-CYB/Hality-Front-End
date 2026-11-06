import type { Usuario } from "@/types/usuario";
import { z } from "zod";
import type { DecisaoConsentimento } from "@/types/consentimento";

/** Para que serve o link enviado por e-mail (`purpose` do back: invitation | password_reset). */
export type FinalidadeDeSenha = "convite" | "recuperacao";
export type FinalidadeDoLink = FinalidadeDeSenha | "confirmacao_email";
export const tokenDoLinkSchema = z.string().min(20);
export type DefinicaoDeSenha = {
  token: string;
  senha: string;
  consentimentos?: DecisaoConsentimento[];
};
/** Corpo do 202 de `POST /auth/password-recovery`. */
export const respostaRecuperacaoSchema = z.object({ message: z.string() });

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
