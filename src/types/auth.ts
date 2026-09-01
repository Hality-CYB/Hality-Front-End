/**
 * Tipos de autenticação — contrato entre frontend e backend.
 * Espelha os schemas Pydantic de `Hality-Back-End/app/schemas/user.py`.
 */

export interface PatientRegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "patient" | "professional" | "admin";
  is_active: boolean;
  created_at: string;
}
