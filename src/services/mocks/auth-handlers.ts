import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { seedUsuarios } from "@/services/mocks/seed-data";
import { adaptBackendUser, type BackendUser } from "@/types/usuario";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Senha fixa para mock — nunca sai do código de teste. */
const SENHA_MOCK = "123456";

/** Mapeia e-mail → BackendUser para o mock de autenticação. */
function toBackendUser(u: ReturnType<typeof seedUsuarios[number] extends infer T ? () => T : never>): BackendUser {
  const role = u.role === "paciente" ? "patient" : u.role === "profissional" ? "professional" : "admin";
  return {
    id: u.id,
    email: u.email,
    name: u.nome,
    phone: u.telefone ?? null,
    role,
    is_active: true,
    is_superuser: u.role === "admin",
    is_verified: true,
    created_at: u.criadoEm,
  };
}

export const authHandlers = [
  /**
   * POST /api/v1/auth/jwt/login
   * OAuth2 password flow — valida contra seed-data e retorna 200 vazio
   * (o cookie seria Set-Cookie em produção real; no mock, o MSW não tem
   * como emiti-lo de forma transparente, mas o fluxo de teste passa).
   */
  http.post(url("/api/v1/auth/jwt/login"), async ({ request }) => {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const email = params.get("username") ?? "";
    const senha = params.get("password") ?? "";

    const usuario = seedUsuarios.find((u) => u.email === email);
    if (!usuario || senha !== SENHA_MOCK) {
      return HttpResponse.json({ detail: "LOGIN_BAD_CREDENTIALS" }, { status: 400 });
    }

    return new HttpResponse(null, { status: 200 });
  }),

  /**
   * POST /api/v1/auth/register
   */
  http.post(url("/api/v1/auth/register"), async ({ request }) => {
    const body = z
      .object({ email: z.string().email(), name: z.string(), password: z.string() })
      .safeParse(await request.json());

    if (!body.success) {
      return HttpResponse.json({ detail: "REGISTER_INVALID_DATA" }, { status: 422 });
    }

    const jaExiste = seedUsuarios.some((u) => u.email === body.data.email);
    if (jaExiste) {
      return HttpResponse.json({ detail: "REGISTER_USER_ALREADY_EXISTS" }, { status: 400 });
    }

    const novoBackendUser: BackendUser = {
      id: crypto.randomUUID(),
      email: body.data.email,
      name: body.data.name,
      phone: null,
      role: "patient",
      is_active: true,
      is_superuser: false,
      is_verified: false,
    };
    const novo = adaptBackendUser(novoBackendUser);
    seedUsuarios.push(novo);

    return HttpResponse.json(novoBackendUser, { status: 201 });
  }),

  /**
   * POST /api/v1/auth/jwt/logout
   */
  http.post(url("/api/v1/auth/jwt/logout"), () => new HttpResponse(null, { status: 200 })),

  /**
   * POST /api/v1/auth/forgot-password — sempre 202 (anti-enumeração)
   */
  http.post(url("/api/v1/auth/forgot-password"), () => new HttpResponse(null, { status: 202 })),

  /**
   * POST /api/v1/auth/reset-password — mock simula sempre sucesso
   */
  http.post(url("/api/v1/auth/reset-password"), async ({ request }) => {
    const body = await request.json() as { token?: string; password?: string };
    if (!body.token || body.token === "invalid-token") {
      return HttpResponse.json({ detail: "RESET_PASSWORD_BAD_TOKEN" }, { status: 400 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  /**
   * GET /api/v1/users/me — retorna primeiro paciente do seed como usuário logado
   */
  http.get(url("/api/v1/users/me"), () => {
    const paciente = seedUsuarios.find((u) => u.role === "paciente") ?? seedUsuarios[0];
    if (!paciente) {
      return HttpResponse.json({ detail: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    const backendUser: BackendUser = {
      id: paciente.id,
      email: paciente.email,
      name: paciente.nome,
      phone: paciente.telefone ?? null,
      role: "patient",
      is_active: true,
      is_superuser: false,
      is_verified: true,
      created_at: paciente.criadoEm,
    };
    return HttpResponse.json(backendUser);
  }),
];
