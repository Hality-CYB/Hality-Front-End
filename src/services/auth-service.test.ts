import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "./auth-service";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/session";

describe("authService", () => {
  beforeEach(() => {
    clearStoredToken();
    vi.restoreAllMocks();
  });

  const mockBackendUser = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    email: "teste@hality.com",
    name: "Usuário Teste",
    phone: "(11) 99999-9999",
    role: "patient",
    is_active: true,
    is_superuser: false,
    is_verified: true,
    created_at: "2026-09-11T12:00:00Z",
  };

  it("login com sucesso envia form-urlencoded, armazena token e busca getMe", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1ª chamada: POST /api/v1/auth/login
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "jwt-token-xyz",
        token_type: "bearer",
      }),
    } as Response);

    // 2ª chamada: GET /api/v1/users/me
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendUser,
    } as Response);

    const result = await authService.login("teste@hality.com", "Senha123!");

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verifica parâmetros do login
    const [loginUrl, loginInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(loginUrl).toContain("/api/v1/auth/login");
    expect(loginInit.method).toBe("POST");
    const headers = loginInit.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(loginInit.body).toContain("username=teste%40hality.com");
    expect(loginInit.body).toContain("password=Senha123%21");

    // Verifica que o token foi gravado
    expect(getStoredToken()).toBe("jwt-token-xyz");

    // Verifica o retorno adaptado
    expect(result.token).toBe("jwt-token-xyz");
    expect(result.usuario.id).toBe(mockBackendUser.id);
    expect(result.usuario.nome).toBe("Usuário Teste");
    expect(result.usuario.role).toBe("paciente");
  });

  it("login com credenciais inválidas lança ApiError amigável", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: "LOGIN_BAD_CREDENTIALS" }),
    } as Response);

    await expect(authService.login("errado@hality.com", "senha")).rejects.toThrow(
      "E-mail ou senha incorretos.",
    );
    expect(getStoredToken()).toBeNull();
  });

  it("registrar envia JSON e retorna o usuário adaptado", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockBackendUser,
    } as Response);

    const usuario = await authService.registrar({
      nome: "Usuário Teste",
      email: "teste@hality.com",
      senha: "SenhaSegura123!",
      telefone: "(11) 99999-9999",
    });

    expect(usuario.id).toBe(mockBackendUser.id);
    expect(usuario.nome).toBe("Usuário Teste");
    expect(usuario.email).toBe("teste@hality.com");
    expect(usuario.role).toBe("paciente");
  });

  it("registrar com email já cadastrado lança erro amigável", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: "REGISTER_USER_ALREADY_EXISTS" }),
    } as Response);

    await expect(
      authService.registrar({
        nome: "Duplicado",
        email: "teste@hality.com",
        senha: "SenhaSegura123!",
      }),
    ).rejects.toThrow("Este e-mail já está cadastrado.");
  });

  it("logout chama endpoint e limpa token local", async () => {
    setStoredToken("token-ativo");
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await authService.logout();

    expect(getStoredToken()).toBeNull();
  });
});
