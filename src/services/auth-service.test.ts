import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  authService,
  EmailNaoConfirmadoError,
  LinkDeConfirmacaoInvalidoError,
} from "./auth-service";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/session";

/**
 * `authService` fala direto com o FastAPI via `fetch` cru (não passa pelo
 * `apiClient` nem pelo MSW — ver comentário em mocks/handlers.ts), então os
 * testes aqui mockam `global.fetch` diretamente, na ordem em que o service
 * realmente dispara as chamadas.
 */
describe("authService", () => {
  beforeEach(() => {
    clearStoredToken();
    vi.restoreAllMocks();
  });

  const mockBackendUser = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    email: "teste@hality.com",
    name: "Usuário Teste",
    phone: null,
    role: "patient",
    is_active: true,
    is_superuser: false,
    is_verified: false,
  };

  it("login com sucesso salva o access_token e retorna o usuário", async () => {
    global.fetch = vi
      .fn()
      // 1: POST /auth/login
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "jwt-token-xyz", token_type: "bearer" }),
      } as Response)
      // 2: GET /users/me
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendUser,
      } as Response);

    const usuario = await authService.login("teste@hality.com", "Senha123!");

    const [loginUrl, loginInit] = vi.mocked(global.fetch).mock.calls[0]!;
    expect(loginUrl).toBe("http://localhost:8000/api/v1/auth/login");
    expect(loginInit).toMatchObject({ method: "POST", credentials: "include" });
    expect(loginInit?.body).toBe("username=teste%40hality.com&password=Senha123%21");

    const [meUrl, meInit] = vi.mocked(global.fetch).mock.calls[1]!;
    expect(meUrl).toBe("http://localhost:8000/api/v1/users/me");
    expect((meInit?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-token-xyz");

    expect(getStoredToken()).toBe("jwt-token-xyz");
    expect(usuario.id).toBe(mockBackendUser.id);
    expect(usuario.nome).toBe("Usuário Teste");
    expect(usuario.role).toBe("paciente");
  });

  it("login com credenciais erradas lança ApiError e não salva token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    await expect(authService.login("errado@hality.com", "senha")).rejects.toThrow(
      "E-mail ou senha incorretos.",
    );
    expect(getStoredToken()).toBeNull();
  });

  it("login sem conseguir alcançar o back lança erro de conexão amigável", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(authService.login("teste@hality.com", "senha")).rejects.toThrow(
      "Não foi possível conectar ao servidor.",
    );
    expect(getStoredToken()).toBeNull();
  });

  it("registrar envia os dados no formato do back e não inicia sessão", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockBackendUser,
    } as Response);

    const usuario = await authService.registrar({
      nome: "Usuário Teste",
      dataNascimento: "1990-01-01",
      email: "teste@hality.com",
      senha: "SenhaSegura123!",
      telefone: "(11) 99999-9999",
      consentimentos: [
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ],
    });

    const [registerUrl, registerInit] = vi.mocked(global.fetch).mock.calls[0]!;
    expect(registerUrl).toBe("http://localhost:8000/api/v1/auth/register");
    expect(JSON.parse(registerInit?.body as string)).toEqual({
      name: "Usuário Teste",
      email: "teste@hality.com",
      password: "SenhaSegura123!",
      phone: "(11) 99999-9999",
      data_nascimento: "1990-01-01",
      // Decisões explícitas por finalidade, com a recusa do opcional enviada também.
      consentimentos: [
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getStoredToken()).toBeNull();
    expect(usuario.id).toBe(mockBackendUser.id);
  });

  it("registrar com e-mail duplicado lança mensagem específica", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "REGISTER_USER_ALREADY_EXISTS" }),
    } as Response);

    await expect(
      authService.registrar({
        nome: "Fulano",
        dataNascimento: "1990-01-01",
        email: "ja-existe@hality.com",
        senha: "SenhaSegura123!",
        consentimentos: [{ finalidade: "health_data", versao: "v1", aceito: true }],
      }),
    ).rejects.toThrow("Este e-mail já está cadastrado.");
  });

  it.each([
    [422, "Para criar a conta, aceite o tratamento dos seus dados de saúde."],
    [409, "Os termos foram atualizados. Leia a versão nova e confirme de novo."],
  ])("registrar com recusa de consentimento (%i) explica o motivo", async (status, mensagem) => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ detail: "erro do back" }),
    } as Response);

    await expect(
      authService.registrar({
        nome: "Fulano",
        dataNascimento: "1990-01-01",
        email: "novo@hality.com",
        senha: "SenhaSegura123!",
        consentimentos: [{ finalidade: "health_data", versao: "v0", aceito: true }],
      }),
    ).rejects.toThrow(mensagem);
  });

  it("logout chama /auth/logout com o cookie (credentials: include) e limpa o token local", async () => {
    setStoredToken("token-ativo");
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    await authService.logout();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    expect(getStoredToken()).toBeNull();
  });

  it("logout limpa o token local mesmo se o back estiver fora do ar", async () => {
    setStoredToken("token-ativo");
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await authService.logout();

    expect(getStoredToken()).toBeNull();
  });

  it("login de conta não confirmada lança EmailNaoConfirmadoError e não salva token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "EMAIL_NOT_VERIFIED" }),
    } as Response);

    await expect(authService.login("teste@hality.com", "Senha123!")).rejects.toBeInstanceOf(
      EmailNaoConfirmadoError,
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getStoredToken()).toBeNull();
  });

  describe("confirmação de e-mail", () => {
    const token = "t".repeat(32);

    function respostaApi(status: number, corpo?: unknown) {
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
    }

    it("confirmarEmail envia o token e não grava sessão", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(respostaApi(204));

      await authService.confirmarEmail(token);

      const [url, init] = vi.mocked(global.fetch).mock.calls[0]!;
      expect(url).toBe("http://localhost:8000/api/v1/auth/email-verification/confirm");
      expect(JSON.parse(init?.body as string)).toEqual({ token });
      expect(getStoredToken()).toBeNull();
    });

    it("confirmarEmail com token inválido do back lança LinkDeConfirmacaoInvalidoError", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(respostaApi(400, { detail: "TOKEN_DE_VERIFICACAO_INVALIDO" }));

      await expect(authService.confirmarEmail(token)).rejects.toBeInstanceOf(
        LinkDeConfirmacaoInvalidoError,
      );
    });

    it("confirmarEmail com token curto não chama o back", async () => {
      global.fetch = vi.fn();

      await expect(authService.confirmarEmail("curto")).rejects.toBeInstanceOf(
        LinkDeConfirmacaoInvalidoError,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("confirmarEmail com falha temporária não vaza o token na mensagem", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(respostaApi(500, { detail: token }));

      const erro = await authService.confirmarEmail(token).catch((e: Error) => e);

      expect(erro).not.toBeInstanceOf(LinkDeConfirmacaoInvalidoError);
      expect((erro as Error).message).not.toContain(token);
    });

    it("reenviarConfirmacao aceita o 202 genérico", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(respostaApi(202, { message: "ok" }));

      await expect(authService.reenviarConfirmacao(" Teste@Hality.com ")).resolves.toBeUndefined();

      const [url, init] = vi.mocked(global.fetch).mock.calls[0]!;
      expect(url).toBe("http://localhost:8000/api/v1/auth/email-verification/resend");
      expect(JSON.parse(init?.body as string)).toEqual({ email: "Teste@Hality.com" });
    });

    it("reenviarConfirmacao recusa e-mail inválido sem chamar o back", async () => {
      global.fetch = vi.fn();

      await expect(authService.reenviarConfirmacao("nao-e-email")).rejects.toThrow(
        "Informe um e-mail válido.",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("reenviarConfirmacao com 429 pede para aguardar", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(respostaApi(429, { detail: "x" }));

      await expect(authService.reenviarConfirmacao("teste@hality.com")).rejects.toThrow(
        "Muitas tentativas",
      );
    });
  });
});
