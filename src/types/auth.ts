import type { Usuario } from "@/types/usuario";
import { z } from "zod";
import type { DecisaoConsentimento } from "@/types/consentimento";

export type IdentityPurpose = "password_reset" | "invitation";
export const identityTokenSchema = z.string().min(20);
// Política da interface aprovada nas referências. O backend confirmado exige mínimo de 8.
export const identityPasswordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/);
export type IdentityConfirmation = {
  token: string;
  senha: string;
  consentimentos?: DecisaoConsentimento[];
};
export const invitationConsentRequiredResponseSchema = z.object({
  detail: z.literal("o consentimento para tratamento de dados de saúde é obrigatório"),
});
export const passwordRecoveryResponseSchema = z.object({ message: z.string() });

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
