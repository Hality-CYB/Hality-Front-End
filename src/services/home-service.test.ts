import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/services/mocks/server";
import { homeService } from "./home-service";
import { config } from "@/lib/config";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

describe("homeService", () => {
  it("parseia ultimo_diagnostico: null (sem diagnóstico ainda)", async () => {
    server.use(
      http.get(url("/api/v1/home"), () =>
        HttpResponse.json({
          usuario: {
            id: "8e87b763-0e78-469a-a081-9b99600a3554",
            nome: "Lucas Gaelzer Machado",
            tipo_usuario: "patient",
          },
          total_diagnosticos: 0,
          avisos_nao_lidos: 0,
          ultimo_diagnostico: null,
          total_dicas: 4,
          dicas: [
            { id: 1, titulo: "O que é halitose?", conteudo: "..." },
            { id: 2, titulo: "Limpe a língua todos os dias", conteudo: "..." },
          ],
        }),
      ),
    );

    const home = await homeService.buscar();

    expect(home).toEqual({
      usuarioNome: "Lucas Gaelzer Machado",
      totalDiagnosticos: 0,
      avisosNaoLidos: 0,
      ultimoDiagnostico: null,
      totalDicas: 4,
      dicas: [
        { id: 1, titulo: "O que é halitose?", conteudo: "..." },
        { id: 2, titulo: "Limpe a língua todos os dias", conteudo: "..." },
      ],
    });
  });

  it("parseia ultimo_diagnostico concluído, com classificacao aninhada", async () => {
    server.use(
      http.get(url("/api/v1/home"), () =>
        HttpResponse.json({
          usuario: { id: "uuid-string", nome: "abc", tipo_usuario: "patient" },
          total_diagnosticos: 7,
          avisos_nao_lidos: 0,
          ultimo_diagnostico: {
            id: 7,
            data_diagnostico: "2026-09-17T22:59:57.017013Z",
            status: "concluido",
            classificacao: { codigo: "halitose_leve", nome_exibicao: "Halitose Leve" },
            escala_saburra: 24,
          },
          total_dicas: 4,
          dicas: [],
        }),
      ),
    );

    const home = await homeService.buscar();

    expect(home).toEqual({
      usuarioNome: "abc",
      totalDiagnosticos: 7,
      avisosNaoLidos: 0,
      ultimoDiagnostico: {
        id: 7,
        dataDiagnostico: "2026-09-17T22:59:57.017013Z",
        status: "concluido",
        classificacaoCodigo: "halitose_leve",
        classificacaoLabel: "Halitose Leve",
        escalaSaburra: 24,
      },
      totalDicas: 4,
      dicas: [],
    });
  });

  it("parseia ultimo_diagnostico processando, com classificacao e escala_saburra null juntos", async () => {
    server.use(
      http.get(url("/api/v1/home"), () =>
        HttpResponse.json({
          usuario: { id: "uuid-string", nome: "abc", tipo_usuario: "patient" },
          total_diagnosticos: 7,
          avisos_nao_lidos: 0,
          ultimo_diagnostico: {
            id: 7,
            data_diagnostico: "2026-09-17T22:59:57.017013Z",
            status: "processando",
            classificacao: null,
            escala_saburra: null,
          },
          total_dicas: 4,
          dicas: [],
        }),
      ),
    );

    const home = await homeService.buscar();

    expect(home.ultimoDiagnostico).toEqual({
      id: 7,
      dataDiagnostico: "2026-09-17T22:59:57.017013Z",
      status: "processando",
      classificacaoCodigo: null,
      classificacaoLabel: null,
      escalaSaburra: null,
    });
  });

  it("parseia status desconhecido (não é enum no back) sem quebrar o parse", async () => {
    server.use(
      http.get(url("/api/v1/home"), () =>
        HttpResponse.json({
          usuario: { id: "uuid-string", nome: "abc", tipo_usuario: "patient" },
          total_diagnosticos: 1,
          avisos_nao_lidos: 0,
          ultimo_diagnostico: {
            id: 9,
            data_diagnostico: "2026-09-17T22:59:57.017013Z",
            status: "falha",
            classificacao: null,
            escala_saburra: null,
          },
          total_dicas: 0,
          dicas: [],
        }),
      ),
    );

    const home = await homeService.buscar();

    expect(home.ultimoDiagnostico?.status).toBe("falha");
  });
});
