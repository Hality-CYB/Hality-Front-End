import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";
import { authService } from "@/services/auth-service";
import { server } from "@/services/mocks/server";

const exchangeUrl = `${config.apiBaseUrl}/api/v1/auth/google/exchange`;
const codigo = "codigo-temporario-de-uso-unico";

afterEach(() => {
  clearStoredToken();
  vi.restoreAllMocks();
});

describe("contrato do login com Google", () => {
  it("monta a URL do authorize no backend", () => {
    expect(authService.obterUrlDeAutorizacaoGoogle()).toBe(
      `${config.apiBaseUrl}/api/v1/auth/google/authorize`,
    );
  });

  it("troca o código sem Bearer, recebe o cookie e salva somente o access token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let body: unknown;
    server.use(
      http.post(exchangeUrl, async ({ request }) => {
        expect(request.headers.get("authorization")).toBeNull();
        body = await request.json();
        return HttpResponse.json({ access_token: "access-google", token_type: "bearer" });
      }),
    );

    await authService.trocarCodigoGoogle({ codigo });

    expect(body).toEqual({ codigo });
    expect(getStoredToken()).toBe("access-google");
    expect(fetchSpy).toHaveBeenCalledWith(
      exchangeUrl,
      expect.objectContaining({ credentials: "include", referrerPolicy: "no-referrer" }),
    );
  });

  it("envia os consentimentos somente quando informados", async () => {
    const consentimentos = [
      { finalidade: "health_data" as const, versao: "v1", aceito: true },
      { finalidade: "image_training" as const, versao: "v1", aceito: false },
    ];
    let body: unknown;
    server.use(
      http.post(exchangeUrl, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ access_token: "access-google", token_type: "bearer" });
      }),
    );

    await authService.trocarCodigoGoogle({ codigo, consentimentos });

    expect(body).toEqual({ codigo, consentimentos });
  });

  it("rejeita código inválido antes de chamar o backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(authService.trocarCodigoGoogle({ codigo: "" })).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("não expõe o código temporário nem substitui a sessão quando a troca falha", async () => {
    setStoredToken("sessao-anterior");
    server.use(
      http.post(exchangeUrl, () => HttpResponse.json({ detail: { codigo } }, { status: 400 })),
    );

    const erro = await authService.trocarCodigoGoogle({ codigo }).catch((value: unknown) => value);

    expect(JSON.stringify(erro)).not.toContain(codigo);
    expect(erro).toMatchObject({ status: 400 });
    expect(getStoredToken()).toBe("sessao-anterior");
  });

  it("transforma falha de rede em mensagem recuperável sem apagar a sessão anterior", async () => {
    setStoredToken("sessao-anterior");
    server.use(http.post(exchangeUrl, () => HttpResponse.error()));

    await expect(authService.trocarCodigoGoogle({ codigo })).rejects.toThrow(
      "Não foi possível conectar ao servidor",
    );
    expect(getStoredToken()).toBe("sessao-anterior");
  });

  it("preserva o tempo de espera informado pelo rate limit", async () => {
    server.use(
      http.post(exchangeUrl, () =>
        HttpResponse.json(
          { detail: "muitas tentativas" },
          { status: 429, headers: { "Retry-After": "7" } },
        ),
      ),
    );

    await expect(authService.trocarCodigoGoogle({ codigo })).rejects.toMatchObject({
      status: 429,
      segundosParaTentarDeNovo: 7,
    });
  });

  it("não cria sessão se o backend responder fora do contrato", async () => {
    server.use(
      http.post(exchangeUrl, () => HttpResponse.json({ access_token: "access-sem-tipo" })),
    );

    await expect(authService.trocarCodigoGoogle({ codigo })).rejects.toThrow(
      "Não foi possível entrar com o Google",
    );
    expect(getStoredToken()).toBeNull();
  });

  it.each([
    [403, "login com Google disponível apenas para pacientes", "apenas para pacientes"],
    [403, "conta inativa", "conta está inativa"],
    [409, "já existe uma conta com este e-mail", "e-mail e senha"],
    [409, "versão do termo desatualizada; versão vigente: v2", "termos foram atualizados"],
    [422, "o consentimento é obrigatório", "Revise as decisões"],
    [503, "login com Google não configurado", "indisponível"],
  ])("traduz o erro %i do backend para uma mensagem segura", async (status, detail, mensagem) => {
    server.use(http.post(exchangeUrl, () => HttpResponse.json({ detail }, { status })));
    await expect(authService.trocarCodigoGoogle({ codigo })).rejects.toThrow(mensagem);
  });
});
