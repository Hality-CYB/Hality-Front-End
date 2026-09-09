/**
 * Contrato do endpoint POST /api/v1/auth/login do backend.
 *
 * Formato assumido (padrão FastAPI/OAuth2 — snake_case, `access_token` +
 * `token_type`); ajustar aqui caso o backend (Hality-Back-End) defina algo
 * diferente. Este é o único lugar do frontend que deveria precisar mudar.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}
