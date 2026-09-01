/**
 * Serviço de autenticação — chamadas à API de auth via apiClient.
 * Segue o padrão: services/ chama lib/api-client.ts, nunca fetch direto.
 */

import { apiClient } from "@/lib/api-client";
import type { AuthResponse, LoginInput, PatientRegisterInput, User } from "@/types/auth";

export const authService = {
  /** Cadastra um novo paciente e retorna o token JWT. */
  registerPatient: (data: PatientRegisterInput) =>
    apiClient.post<AuthResponse>("/api/v1/auth/register-patient", data),

  /** Autentica o usuário e retorna o token JWT. */
  login: (credentials: LoginInput) =>
    apiClient.post<AuthResponse>("/api/v1/auth/login", credentials),

  /** Retorna os dados do usuário autenticado (requer token). */
  getCurrentUser: () => apiClient.get<User>("/api/v1/auth/me"),
};
