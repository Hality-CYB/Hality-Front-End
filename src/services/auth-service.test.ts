import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "./auth-service";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/session";

describe("authService", () => {
  beforeEach(() => {
    clearStoredToken();
    vi.restoreAllMocks();
  });

  const mockUsuario = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    email: "teste@hality.com",
    nome: "Usuário Teste",
    role: "paciente",
    accessToken: "jwt-token-xyz",
  };

  it("login com sucesso salva token e retorna usuario", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockUsuario,
    } as Response);

    const usuario = await authService.login("teste@hality.com", "Senha123!");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "teste@hality.com", senha: "Senha123!" }),
      }),
    );
    expect(getStoredToken()).toBe("jwt-token-xyz");
    expect(usuario.id).toBe(mockUsuario.id);
    expect(usuario.nome).toBe("Usuário Teste");
  });

  it("login com erro lança ApiError", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ erro: "E-mail ou senha incorretos." }),
    } as Response);

    await expect(authService.login("errado@hality.com", "senha")).rejects.toThrow(
      "E-mail ou senha incorretos.",
    );
    expect(getStoredToken()).toBeNull();
  });

  it("registrar envia dados com telefone e retorna usuario", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockUsuario,
    } as Response);

    const usuario = await authService.registrar({
      nome: "Usuário Teste",
      email: "teste@hality.com",
      senha: "SenhaSegura123!",
      telefone: "(11) 99999-9999",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          nome: "Usuário Teste",
          email: "teste@hality.com",
          senha: "SenhaSegura123!",
          telefone: "(11) 99999-9999",
        }),
      }),
    );
    expect(usuario.id).toBe(mockUsuario.id);
  });

  it("logout chama /api/auth/logout e limpa token local", async () => {
    setStoredToken("token-ativo");
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    await authService.logout();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(getStoredToken()).toBeNull();
  });
});
