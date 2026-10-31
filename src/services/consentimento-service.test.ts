import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import {
  registrarDecisoesMock,
  tratamentoBloqueadoMock,
  validarDecisoesCadastroMock,
} from "@/services/mocks/consentimentos-handlers";
import { consentimentoService } from "@/services/consentimento-service";
import { profissionalService } from "@/services/profissional-service";
import { fusoDoNavegador } from "@/lib/datas";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

describe("consentimentoService (US-020, #160 do back)", () => {
  beforeEach(() => setStoredToken("mock-token:paciente-2"));
  afterEach(() => {
    clearStoredToken();
    vi.restoreAllMocks();
  });

  it("lista os dois termos com versão e se são obrigatórios", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const termos = await consentimentoService.listarTermos();
    expect(fetchSpy).toHaveBeenCalledWith(
      url("/api/v1/consentimentos/termos"),
      expect.objectContaining({
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      }),
    );
    expect(termos.map((t) => [t.finalidade, t.obrigatorio])).toEqual([
      ["health_data", true],
      ["image_training", false],
    ]);
    expect(termos.every((t) => t.versao && t.texto)).toBe(true);
  });

  it("não anexa Bearer nem renova ou apaga sessão ao buscar termos públicos", async () => {
    const refresh = vi.fn(() => new HttpResponse(null, { status: 401 }));
    server.use(
      http.get(url("/api/v1/consentimentos/termos"), ({ request }) => {
        expect(request.headers.get("authorization")).toBeNull();
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(url("/api/v1/auth/refresh"), refresh),
    );
    await expect(consentimentoService.listarTermos()).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
    expect(getStoredToken()).toBe("mock-token:paciente-2");
  });

  it("sem decisão nenhuma, cada finalidade pede decisão e nada vale", async () => {
    const estado = await consentimentoService.meus();
    expect(estado.every((c) => c.aceito === null && !c.vigente && c.requerDecisao)).toBe(true);
  });

  it("aceitar e revogar acumulam histórico; o estado devolvido é o mais recente", async () => {
    const aceito = await consentimentoService.decidir({
      finalidade: "image_training",
      versao: "v1",
      aceito: true,
    });
    expect(aceito.find((c) => c.finalidade === "image_training")).toMatchObject({
      aceito: true,
      vigente: true,
      requerDecisao: false,
    });

    const revogado = await consentimentoService.decidir({
      finalidade: "image_training",
      versao: "v1",
      aceito: false,
    });
    expect(revogado.find((c) => c.finalidade === "image_training")).toMatchObject({
      aceito: false,
      vigente: false,
    });
  });

  it("versão velha do termo dá 409", async () => {
    const erro = await consentimentoService
      .decidir({ finalidade: "health_data", versao: "v0", aceito: true })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(409);
  });

  it("manda a decisão no formato do back", async () => {
    let corpo: unknown;
    server.use(
      http.post(url("/api/v1/users/me/consentimentos"), async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({ consentimentos: [], recorded_at: null });
      }),
    );
    await consentimentoService.decidir({ finalidade: "health_data", versao: "v1", aceito: false });
    expect(corpo).toEqual({ finalidade: "health_data", versao: "v1", aceito: false });
  });
});

describe("regras do mock no cadastro (iguais às do back)", () => {
  it("exige o aceite de dados de saúde, mas aceita recusar o treino", () => {
    expect(() =>
      validarDecisoesCadastroMock([
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ]),
    ).not.toThrow();
    expect(() =>
      validarDecisoesCadastroMock([{ finalidade: "health_data", versao: "v1", aceito: false }]),
    ).toThrow(/obrigatório/);
    expect(() =>
      validarDecisoesCadastroMock([
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "health_data", versao: "v1", aceito: true },
      ]),
    ).toThrow(/repetida/);
  });

  it("só bloqueia diagnóstico de quem decidiu e não está vigente", () => {
    expect(tratamentoBloqueadoMock("paciente-sem-decisao")).toBe(false);
    registrarDecisoesMock("paciente-revogou", [
      { finalidade: "health_data", versao: "v1", aceito: false },
    ]);
    expect(tratamentoBloqueadoMock("paciente-revogou")).toBe(true);
  });
});

describe("profissionalService.resumo", () => {
  afterEach(() => clearStoredToken());

  it("manda o fuso do navegador (o padrão do back é UTC)", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/profissional/resumo"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    setStoredToken("mock-token:profissional-1");
    await profissionalService.resumo().catch(() => undefined);
    expect(query?.get("timezone")).toBe(fusoDoNavegador());
  });
});
