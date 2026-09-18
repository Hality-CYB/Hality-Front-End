// @vitest-environment node
// FormData/File do jsdom não são serializados pelo fetch (undici) do Node;
// o service não depende de DOM, então roda no ambiente node.
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { ZodError } from "zod";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { server } from "@/services/mocks/server";
import { diagnosticoService } from "@/services/diagnostico-service";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

const BYTES_IMAGEM = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function imagemFake() {
  return new File([BYTES_IMAGEM], "lingua.jpg", { type: "image/jpeg" });
}

function detalheBackend(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    data_diagnostico: "2026-09-17T10:00:00",
    status: "concluido",
    classificacao: {
      id: 3,
      codigo: "mau_halito_social",
      nome_exibicao: "Mau Hálito Social",
      ordem: 3,
    },
    escala_saburra: 68,
    confianca_ia: 0.876,
    imagens: [
      {
        id: 1,
        url_arquivo: "/api/v1/diagnosticos/imagens/primeira.jpg",
        ordem: 1,
        data_captura: "2026-09-17T10:00:00",
      },
      {
        id: 2,
        url_arquivo: "/api/v1/diagnosticos/imagens/segunda.jpg",
        ordem: 2,
        data_captura: "2026-09-17T10:00:01",
      },
    ],
    anamnese: { id: 101, data_preenchimento: "2026-09-17T09:59:00", respostas: [] },
    revisao: null,
    tem_profissional_vinculado: false,
    conteudos: [],
    aviso_legal: "...",
    erro: null,
    ...overrides,
  };
}

const PROCESSANDO = { status: "processando", classificacao: null, confianca_ia: null };

/** Responde o GET /diagnosticos/42 com cada corpo da lista, em ordem, e conta as chamadas. */
function sequenciaDeGets(...corpos: Record<string, unknown>[]) {
  const chamadas: number[] = [];
  server.use(
    http.get(url("/api/v1/diagnosticos/42"), () => {
      chamadas.push(Date.now());
      const corpo = corpos[Math.min(chamadas.length - 1, corpos.length - 1)];
      return HttpResponse.json(detalheBackend(corpo));
    }),
  );
  return chamadas;
}

describe("diagnosticoService.criar", () => {
  it("envia multipart com anamnese_id, a imagem intacta e parametros_captura em JSON", async () => {
    let contentType: string | null = null;
    let recebido: FormData | undefined;
    server.use(
      http.post(url("/api/v1/diagnosticos"), async ({ request }) => {
        contentType = request.headers.get("content-type");
        recebido = await request.formData();
        return HttpResponse.json(
          {
            id: 7,
            status: "processando",
            data_diagnostico: "2026-09-17T10:00:00",
            anamnese_id: 101,
          },
          { status: 202 },
        );
      }),
    );

    const criado = await diagnosticoService.criar({
      anamneseId: "101",
      imagem: imagemFake(),
      parametrosCaptura: { origem: "galeria", largura: 800, altura: 600 },
    });

    expect(criado).toEqual({ id: "7", status: "processando" });
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(recebido!.get("anamnese_id")).toBe("101");
    const imagem = recebido!.get("imagem") as File;
    expect(imagem.name).toBe("lingua.jpg");
    expect(imagem.type).toBe("image/jpeg");
    expect(new Uint8Array(await imagem.arrayBuffer())).toEqual(BYTES_IMAGEM);
    expect(JSON.parse(recebido!.get("parametros_captura") as string)).toEqual({
      origem: "galeria",
      largura: 800,
      altura: 600,
    });
  });

  it("propaga o erro do back (ex.: 422 anamnese já usada) como ApiError", async () => {
    server.use(
      http.post(url("/api/v1/diagnosticos"), () =>
        HttpResponse.json({ detail: "anamnese já vinculada a outro diagnóstico" }, { status: 422 }),
      ),
    );

    const promessa = diagnosticoService.criar({
      anamneseId: "101",
      imagem: imagemFake(),
      parametrosCaptura: {},
    });

    await expect(promessa).rejects.toBeInstanceOf(ApiError);
    await expect(promessa).rejects.toMatchObject({ status: 422 });
  });

  it("rejeita uma resposta 202 fora do contrato do back", async () => {
    server.use(
      http.post(url("/api/v1/diagnosticos"), () =>
        HttpResponse.json({ id: "sete", status: "processando" }, { status: 202 }),
      ),
    );

    await expect(
      diagnosticoService.criar({ anamneseId: "101", imagem: imagemFake(), parametrosCaptura: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("diagnosticoService.listar", () => {
  function itemBackend(overrides: Record<string, unknown> = {}) {
    return {
      id: 187,
      data_diagnostico: "2026-09-18T12:00:00Z",
      status: "concluido",
      classificacao: { codigo: "halito_normal", nome_exibicao: "Hálito Normal", ordem: 1 },
      escala_saburra: 24,
      ...overrides,
    };
  }

  function respostaLista(itens: unknown[], extra: Record<string, unknown> = {}) {
    return { itens, pagina: 1, limite: 20, total: itens.length, total_paginas: 1, ...extra };
  }

  it("manda os filtros com os nomes do back e não manda pacienteId", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/diagnosticos"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(respostaLista([]));
      }),
    );

    await diagnosticoService.listar({
      status: "concluido",
      dataInicio: "2026-09-01T03:00:00.000Z",
      dataFim: "2026-09-18T02:59:59.999Z",
      pagina: 2,
      limite: 10,
      ordem: "data_asc",
    });

    expect(Object.fromEntries(query!)).toEqual({
      status: "concluido",
      data_inicio: "2026-09-01T03:00:00.000Z",
      data_fim: "2026-09-18T02:59:59.999Z",
      pagina: "2",
      limite: "10",
      ordem: "data_asc",
    });
  });

  it("sem filtros, chama a rota sem query string", async () => {
    let chamada: string | undefined;
    server.use(
      http.get(url("/api/v1/diagnosticos"), ({ request }) => {
        chamada = request.url;
        return HttpResponse.json(respostaLista([]));
      }),
    );

    await diagnosticoService.listar();

    expect(chamada).toBe(url("/api/v1/diagnosticos"));
  });

  it("adapta a página do back: ordem vira nível e classificacao null vira nível null", async () => {
    server.use(
      http.get(url("/api/v1/diagnosticos"), () =>
        HttpResponse.json(
          respostaLista(
            [
              itemBackend(),
              itemBackend({
                id: 188,
                classificacao: {
                  codigo: "halitose_intima",
                  nome_exibicao: "Halitose Íntima",
                  ordem: 2,
                },
              }),
              itemBackend({ id: 189, status: "processando", classificacao: null }),
              itemBackend({ id: 190, status: "falha", classificacao: null }),
            ],
            { pagina: 2, limite: 4, total: 9, total_paginas: 3 },
          ),
        ),
      ),
    );

    const pagina = await diagnosticoService.listar();

    expect(pagina).toEqual({
      itens: [
        { id: "187", nivel: 1, status: "concluido", criadoEm: "2026-09-18T12:00:00Z" },
        { id: "188", nivel: 2, status: "concluido", criadoEm: "2026-09-18T12:00:00Z" },
        { id: "189", nivel: null, status: "processando", criadoEm: "2026-09-18T12:00:00Z" },
        { id: "190", nivel: null, status: "falha", criadoEm: "2026-09-18T12:00:00Z" },
      ],
      pagina: 2,
      total: 9,
      totalPaginas: 3,
    });
  });

  it("rejeita uma resposta fora do contrato (ex.: lista simples do formato antigo)", async () => {
    server.use(http.get(url("/api/v1/diagnosticos"), () => HttpResponse.json([itemBackend()])));

    await expect(diagnosticoService.listar()).rejects.toBeInstanceOf(ZodError);
  });
});

describe("diagnosticoService.buscar", () => {
  it("adapta o detalhe do back pro formato do front", async () => {
    sequenciaDeGets({});

    const diagnostico = await diagnosticoService.buscar("42");

    expect(diagnostico).toEqual({
      id: "42",
      nivel: 3,
      status: "concluido",
      confiancaIA: 88,
      anamneseId: "101",
      imagemUrl: "/api/v1/diagnosticos/imagens/primeira.jpg",
      criadoEm: "2026-09-17T10:00:00",
    });
  });

  it("diagnóstico ainda processando vem sem nível nem confiança", async () => {
    sequenciaDeGets(PROCESSANDO);

    const diagnostico = await diagnosticoService.buscar("42");

    expect(diagnostico.nivel).toBeNull();
    expect(diagnostico.confiancaIA).toBeUndefined();
  });

  it.each([0, 4, 7])(
    "classificação com ordem %i (fora de 1 a 3) vira nível null em vez de quebrar",
    async (ordem) => {
      sequenciaDeGets({
        classificacao: { id: 9, codigo: "desconhecida", nome_exibicao: "?", ordem },
      });

      const diagnostico = await diagnosticoService.buscar("42");

      expect(diagnostico.nivel).toBeNull();
    },
  );

  it("sem imagens, imagemUrl fica vazia", async () => {
    sequenciaDeGets({ imagens: [] });

    const diagnostico = await diagnosticoService.buscar("42");

    expect(diagnostico.imagemUrl).toBe("");
  });
});

describe("diagnosticoService.aguardarResultado", () => {
  it("consulta até sair de processando e devolve o diagnóstico concluído", async () => {
    const chamadas = sequenciaDeGets(PROCESSANDO, PROCESSANDO, {});

    const diagnostico = await diagnosticoService.aguardarResultado("42", { intervaloMs: 1 });

    expect(chamadas).toHaveLength(3);
    expect(diagnostico.status).toBe("concluido");
    expect(diagnostico.nivel).toBe(3);
  });

  it("para de consultar quando o back marca falha", async () => {
    const chamadas = sequenciaDeGets(PROCESSANDO, { ...PROCESSANDO, status: "falha" });

    const diagnostico = await diagnosticoService.aguardarResultado("42", { intervaloMs: 1 });

    expect(chamadas).toHaveLength(2);
    expect(diagnostico.status).toBe("falha");
  });

  it("propaga um erro do back no meio do polling em vez de continuar consultando", async () => {
    let chamadas = 0;
    server.use(
      http.get(url("/api/v1/diagnosticos/42"), () => {
        chamadas++;
        return chamadas === 1
          ? HttpResponse.json(detalheBackend(PROCESSANDO))
          : HttpResponse.json({ detail: "erro interno" }, { status: 500 });
      }),
    );

    const promessa = diagnosticoService.aguardarResultado("42", { intervaloMs: 1 });

    await expect(promessa).rejects.toBeInstanceOf(ApiError);
    await expect(promessa).rejects.toMatchObject({ status: 500 });
    expect(chamadas).toBe(2);
  });

  it("espera o intervalo entre uma consulta e outra", async () => {
    const chamadas = sequenciaDeGets(PROCESSANDO, {});

    await diagnosticoService.aguardarResultado("42", { intervaloMs: 60 });

    expect(chamadas).toHaveLength(2);
    expect(chamadas[1]! - chamadas[0]!).toBeGreaterThanOrEqual(50);
  });

  it("desiste com erro depois de exatamente `tentativas` consultas", async () => {
    const chamadas = sequenciaDeGets(PROCESSANDO);

    await expect(
      diagnosticoService.aguardarResultado("42", { intervaloMs: 1, tentativas: 2 }),
    ).rejects.toThrow("demorando mais que o esperado");
    expect(chamadas).toHaveLength(2);
  });
});
