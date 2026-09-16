import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { mapFrontendRoleToBackend, type Usuario, type BackendUser } from "@/types/usuario";

const usuarios = [...seedUsuarios];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

/**
 * Usado só por `registrarMock` (auth-service.ts) pra registrar um
 * usuário criado durante o cadastro mockado, senão `GET /users/me` logo
 * depois do registro não acharia ninguém (o usuário nunca existiu em
 * seedUsuarios, só na resposta do registro).
 */
export function adicionarUsuarioMock(usuario: Usuario): void {
  usuarios.push(usuario);
}

export const authHandlers = [
  // Usado por RoleLayout pra descobrir quem está logado. O "access_token"
  // mockado (ver MOCK_TOKEN_PREFIX em auth-service.ts) não é um JWT de
  // verdade — é só "mock-token:<usuarioId>", decodificado aqui.
  http.get(url("/api/v1/users/me"), ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    const usuarioId = auth.replace(/^Bearer mock-token:/, "");
    const usuario = usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return new HttpResponse(null, { status: 401 });

    const backendUser: BackendUser = {
      id: usuario.id,
      email: usuario.email,
      name: usuario.nome,
      phone: usuario.telefone ?? null,
      role: mapFrontendRoleToBackend(usuario.role),
      is_active: true,
    };
    return HttpResponse.json(backendUser);
  }),
];
