import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/services/mocks/server";
import { authService, ConsentimentoObrigatorioError } from "@/services/auth-service";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";

const url = (path: string) => `${config.apiBaseUrl}/api/v1/auth/${path}`;
const token = "token-sintetico-somente-para-testes";
afterEach(() => {
  vi.restoreAllMocks();
  clearStoredToken();
});

describe("contratos públicos de identidade (backend develop 1a3d9c9; MSW)", () => {
  it("envia decisões versionadas somente no aceite de convite e preserva a sessão", async () => {
    const consentimentos = [{ finalidade: "health_data" as const, versao: "v1", aceito: true }];
    setStoredToken("sessao-existente");
    server.use(
      http.post(url("invitation/confirm"), async ({ request }) => {
        expect(await request.json()).toEqual({ token, senha: "NovaSenha123", consentimentos });
        expect(request.headers.get("authorization")).toBeNull();
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(url("password-recovery/confirm"), async ({ request }) => {
        expect(await request.json()).toEqual({ token, senha: "NovaSenha123" });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await authService.confirmarIdentidade("invitation", {
      token,
      senha: "NovaSenha123",
      consentimentos,
    });
    await authService.confirmarIdentidade("password_reset", {
      token,
      senha: "NovaSenha123",
      consentimentos,
    });
    expect(getStoredToken()).toBe("sessao-existente");
  });

  it("identifica consentimento obrigatório apenas pela resposta confirmada, sem expor o corpo", async () => {
    server.use(
      http.post(url("invitation/confirm"), () =>
        HttpResponse.json(
          {
            detail: "o consentimento para tratamento de dados de saúde é obrigatório",
            input: { token, senha: "NovaSenha123" },
          },
          { status: 422 },
        ),
      ),
    );
    const error = await authService
      .confirmarIdentidade("invitation", { token, senha: "NovaSenha123" })
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ConsentimentoObrigatorioError);
    expect(JSON.stringify(error)).not.toContain(token);
    expect(JSON.stringify(error)).not.toContain("NovaSenha123");
  });

  it("não confunde validação de senha com exigência de consentimento", async () => {
    server.use(
      http.post(url("invitation/confirm"), () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "senha"], input: "NovaSenha123" }] },
          { status: 422 },
        ),
      ),
    );
    const error = await authService
      .confirmarIdentidade("invitation", { token, senha: "NovaSenha123" })
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(ConsentimentoObrigatorioError);
    expect((error as Error).message).not.toContain("NovaSenha123");
  });

  it("solicita recuperação por HTTP sem Bearer/cookie e preserva a sessão existente", async () => {
    setStoredToken("sessao-existente");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let body: unknown;
    server.use(
      http.post(url("password-recovery"), async ({ request }) => {
        expect(request.headers.get("authorization")).toBeNull();
        body = await request.json();
        return HttpResponse.json(
          { message: "Se o endereço estiver cadastrado, enviaremos instruções." },
          { status: 202 },
        );
      }),
    );
    await authService.solicitarRecuperacao(" pessoa@example.com ");
    expect(body).toEqual({ email: "pessoa@example.com" });
    expect(fetchSpy).toHaveBeenCalledWith(
      url("password-recovery"),
      expect.objectContaining({
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      }),
    );
    expect(getStoredToken()).toBe("sessao-existente");
  });

  it.each(["password_reset", "invitation"] as const)(
    "confirma %s com token e senha e aceita 204",
    async (purpose) => {
      setStoredToken("sessao-existente");
      const path = purpose === "invitation" ? "invitation" : "password-recovery";
      let body: unknown;
      server.use(
        http.post(url(`${path}/confirm`), async ({ request }) => {
          expect(request.headers.get("authorization")).toBeNull();
          body = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await authService.confirmarIdentidade(purpose, { token, senha: "NovaSenha123" });
      expect(body).toEqual({ token, senha: "NovaSenha123" });
      expect(getStoredToken()).toBe("sessao-existente");
    },
  );

  it.each(["inválido", "expirado", "usado", "revogado"])(
    "mantém a resposta agrupada do backend para token %s",
    async () => {
      server.use(
        http.post(url("password-recovery/confirm"), () =>
          HttpResponse.json({ detail: "TOKEN_DE_RECUPERACAO_INVALIDO" }, { status: 400 }),
        ),
      );
      await expect(
        authService.confirmarIdentidade("password_reset", { token, senha: "NovaSenha123" }),
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("pode ter expirado"),
      });
    },
  );

  it("não renova nem limpa a sessão se uma chamada pública responder 401", async () => {
    setStoredToken("sessao-existente");
    const refresh = vi.fn();
    server.use(
      http.post(url("password-recovery/confirm"), () => new HttpResponse(null, { status: 401 })),
      http.post(url("refresh"), () => {
        refresh();
        return new HttpResponse(null, { status: 401 });
      }),
    );
    await expect(
      authService.confirmarIdentidade("password_reset", { token, senha: "NovaSenha123" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
    expect(getStoredToken()).toBe("sessao-existente");
  });

  it.each([400, 409, 422, 429, 500, 503])(
    "não expõe respostas sensíveis de erro %s",
    async (status) => {
      server.use(
        http.post(url("invitation/confirm"), () =>
          HttpResponse.json(
            { detail: { input: { token, senha: "NovaSenha123" } } },
            { status, headers: { "Retry-After": "2" } },
          ),
        ),
      );
      const error = await authService
        .confirmarIdentidade("invitation", { token, senha: "NovaSenha123" })
        .catch((value: unknown) => value);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as Error).message).not.toContain(token);
      expect((error as Error).message).not.toContain("NovaSenha123");
      if (status === 429) expect(error).toMatchObject({ retryAfterSeconds: 2 });
    },
  );

  it.each([409, 422])(
    "não confunde erro %s de consentimento com token usado ou conta ativa",
    async (status) => {
      server.use(
        http.post(url("invitation/confirm"), () =>
          HttpResponse.json({ detail: "consentimento" }, { status }),
        ),
      );
      await expect(
        authService.confirmarIdentidade("invitation", { token, senha: "NovaSenha123" }),
      ).rejects.toMatchObject({ status, message: expect.stringContaining("consentimento") });
    },
  );

  it("mantém a resposta genérica 202 também quando o backend limita a recuperação", async () => {
    server.use(
      http.post(url("password-recovery"), () =>
        HttpResponse.json(
          { message: "Se o endereço estiver cadastrado, enviaremos instruções." },
          { status: 202 },
        ),
      ),
    );
    await expect(authService.solicitarRecuperacao("limitado@example.com")).resolves.toBeUndefined();
  });

  it("rejeita e-mail e token inválidos antes de qualquer chamada", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(authService.solicitarRecuperacao("inválido")).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      authService.confirmarIdentidade("invitation", { token: "", senha: "NovaSenha123" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("permite nova tentativa explícita após falha de rede", async () => {
    let attempts = 0;
    server.use(
      http.post(url("password-recovery"), () => {
        attempts++;
        return attempts === 1
          ? HttpResponse.error()
          : HttpResponse.json({ message: "Solicitação aceita" }, { status: 202 });
      }),
    );
    await expect(authService.solicitarRecuperacao("pessoa@example.com")).rejects.toThrow(
      "conectar ao servidor",
    );
    expect(attempts).toBe(1);
    await expect(authService.solicitarRecuperacao("pessoa@example.com")).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });

  it("não considera resposta incompatível como recuperação aceita", async () => {
    server.use(
      http.post(url("password-recovery"), () =>
        HttpResponse.json({ outro: true }, { status: 202 }),
      ),
    );
    await expect(authService.solicitarRecuperacao("pessoa@example.com")).rejects.toThrow(
      "Não foi possível concluir",
    );
  });

  it("não considera status de sucesso diferente do contrato como confirmação concluída", async () => {
    server.use(
      http.post(url("invitation/confirm"), () =>
        HttpResponse.json({ message: "ok" }, { status: 200 }),
      ),
    );
    await expect(
      authService.confirmarIdentidade("invitation", { token, senha: "NovaSenha123" }),
    ).rejects.toThrow("Não foi possível concluir");
  });
});
