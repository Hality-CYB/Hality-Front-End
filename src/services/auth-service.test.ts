import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "./auth-service";
import { ApiError } from "@/lib/api-client";

const mockBackendUser = {
  id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  email: "teste@hality.com",
  name: "Usuário Teste",
  phone: null,
  role: "patient",
  is_active: true,
};

describe("authService (direct FastAPI)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("login envia x-www-form-urlencoded e retorna usuário", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendUser,
      } as Response);

    const usuario = await authService.login("teste@hality.com", "Senha123!");

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const loginCall = calls[0]!;
    expect(loginCall[0]).toContain("/api/v1/auth/jwt/login");
    expect(loginCall[1]!.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(loginCall[1]!.credentials).toBe("include");
    expect(usuario.email).toBe("teste@hality.com");
    expect(usuario.nome).toBe("Usuário Teste");
    expect(usuario.role).toBe("paciente");
  });

  it("login com credenciais erradas lança ApiError", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "LOGIN_BAD_CREDENTIALS" }),
    } as Response);

    await expect(authService.login("errado@hality.com", "senha")).rejects.toBeInstanceOf(ApiError);
  });

  it("registrar registra e faz auto-login", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockBackendUser,
      } as Response)
      // auto-login (jwt/login)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      // users/me
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendUser,
      } as Response);

    const usuario = await authService.registrar({
      nome: "Usuário Teste",
      email: "teste@hality.com",
      senha: "SenhaSegura123!",
      telefone: "(11) 99999-9999",
    });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toContain("/api/v1/auth/register");
    expect(calls[0]![1]!.credentials).toBe("include");
    expect(usuario.email).toBe("teste@hality.com");
  });

  it("registrar lança erro se e-mail já existe", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "REGISTER_USER_ALREADY_EXISTS" }),
    } as Response);

    await expect(
      authService.registrar({
        nome: "Teste",
        email: "teste@hality.com",
        senha: "senha123",
      }),
    ).rejects.toThrow("Este e-mail já está cadastrado.");
  });

  it("logout chama /api/v1/auth/jwt/logout com credentials: include", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    await authService.logout();

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toContain("/api/v1/auth/jwt/logout");
    expect(call[1]!.credentials).toBe("include");
  });
});
