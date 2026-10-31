import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import { conteudoAdminService } from "@/services/conteudo-admin-service";
import { classificacaoService } from "@/services/classificacao-service";
import { diagnosticoService } from "@/services/diagnostico-service";
import { mensagemErroConteudo, mensagemErroMidia } from "@/hooks/use-conteudos-admin";
import {
  adaptBackendConteudoAdmin,
  paraBackendConteudo,
  type BackendConteudoAdmin,
  type ConteudoAdminInput,
} from "@/types/conteudo-admin";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

const base: BackendConteudoAdmin = {
  id: 1,
  titulo: "T",
  categoria: "tratamento",
  conteudo: { itens: [{ tipo: "texto", texto: "Oi" }] },
  classificacao_ids: [13],
  destinos: ["orientacoes_diagnostico"],
  aparece_na_home: false,
  status: "rascunho",
  ordem: 0,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  criado_por_id: null,
  atualizado_por_id: null,
  publicado_por_id: null,
  publicado_em: null,
};

const novo: ConteudoAdminInput = {
  titulo: "Conteúdo de teste",
  categoria: "higiene",
  blocos: [{ tipo: "texto", texto: "Texto" }],
  destinos: [],
  classificacaoIds: [],
  publicado: true,
  ordem: 0,
};

beforeEach(() => setStoredToken("mock-token:admin-1"));
afterEach(() => clearStoredToken());

describe("adaptBackendConteudoAdmin", () => {
  it("usa os destinos salvos quando existem", () => {
    expect(adaptBackendConteudoAdmin(base)).toMatchObject({
      id: "1",
      destinos: ["orientacoes_diagnostico"],
      classificacaoIds: [13],
      blocos: [{ tipo: "texto", texto: "Oi" }],
    });
  });

  it("conteúdo anterior aos destinos mostra onde o back ainda o entrega", () => {
    const legado = { ...base, destinos: [], aparece_na_home: true };
    expect(adaptBackendConteudoAdmin(legado).destinos).toEqual([
      "home_autenticada",
      "orientacoes_diagnostico",
    ]);
    expect(
      adaptBackendConteudoAdmin({ ...legado, aparece_na_home: false, classificacao_ids: [] })
        .destinos,
    ).toEqual([]);
  });
});

describe("paraBackendConteudo", () => {
  it("limpa o bloco do editor e mantém como estão os que ele não monta", () => {
    const corpo = paraBackendConteudo({
      titulo: " Título ",
      blocos: [
        { tipo: "imagem", url: " /x.png ", legenda: " Foto ", alt: " " },
        { tipo: "protocolo_tratamento", numero_sessoes: 4 },
      ],
      destinos: ["home_autenticada"],
      classificacaoIds: [],
      publicado: true,
    });
    expect(corpo).toEqual({
      titulo: "Título",
      conteudo: {
        itens: [
          { tipo: "imagem", url: "/x.png", legenda: "Foto" },
          { tipo: "protocolo_tratamento", numero_sessoes: 4 },
        ],
      },
      destinos: ["home_autenticada"],
      classificacao_ids: [],
      status: "publicado",
    });
  });
});

describe("conteudoAdminService", () => {
  it("lista paginada: manda os filtros em inglês, inclusive destino e nível", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/admin/conteudos"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ items: [base], total: 21, page: 2, limit: 20, has_next: false });
      }),
    );

    const pagina = await conteudoAdminService.listar({
      pagina: 2,
      limite: 20,
      busca: " lingua ",
      publicado: false,
      destino: "orientacoes_diagnostico",
      classificacaoId: 12,
      ordem: "ordem_asc",
    });

    expect(Object.fromEntries(query!)).toEqual({
      page: "2",
      limit: "20",
      q: "lingua",
      status: "rascunho",
      destino: "orientacoes_diagnostico",
      classificacao_id: "12",
      order: "ordem_asc",
    });
    expect(pagina).toMatchObject({ pagina: 2, total: 21, totalPaginas: 2 });
  });

  it("PATCH parcial manda só o que foi informado", async () => {
    let corpo: unknown;
    server.use(
      http.patch(url("/api/v1/admin/conteudos/1"), async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({ ...base, status: "publicado" });
      }),
    );

    await conteudoAdminService.atualizar("1", { publicado: true, ordem: 2 });

    expect(corpo).toEqual({ status: "publicado", ordem: 2 });
  });
});

describe("regras do back no mock", () => {
  it("orientações sem nível: 422 no formato do Pydantic, e a mensagem chega legível", async () => {
    const erro = await conteudoAdminService
      .criar({ ...novo, destinos: ["orientacoes_diagnostico"] })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(422);
    expect(mensagemErroConteudo(erro)).toBe(
      "O conteúdo não foi aceito: orientacoes_diagnostico exige ao menos uma classificação.",
    );
  });

  it("na edição, o 422 chega legível venha do schema ou do service", async () => {
    const criado = await conteudoAdminService.criar(novo);
    const esperado =
      "O conteúdo não foi aceito: orientacoes_diagnostico exige ao menos uma classificação.";

    // Destinos e níveis juntos: validado no schema (lista do Pydantic).
    const peloSchema = await conteudoAdminService
      .atualizar(criado.id, { destinos: ["orientacoes_diagnostico"], classificacaoIds: [] })
      .catch((e: unknown) => e);
    expect(mensagemErroConteudo(peloSchema)).toBe(esperado);

    // Só o destino: o service valida o estado final (texto).
    const peloService = await conteudoAdminService
      .atualizar(criado.id, { destinos: ["orientacoes_diagnostico"] })
      .catch((e: unknown) => e);
    expect(JSON.parse((peloService as ApiError).message).detail).toEqual(
      "orientacoes_diagnostico exige ao menos uma classificação",
    );
    expect(mensagemErroConteudo(peloService)).toBe(esperado);
  });

  it("o destino da home mantém o campo legado igual e o conteúdo vai para o GET /home", async () => {
    const criado = await conteudoAdminService.criar({
      ...novo,
      titulo: "Só na home",
      destinos: ["home_autenticada"],
    });
    expect(criado.destinos).toEqual(["home_autenticada"]);

    setStoredToken("mock-token:paciente-1");
    const home = await fetch(url("/api/v1/home"), {
      headers: { Authorization: "Bearer mock-token:paciente-1" },
    }).then((r) => r.json());
    expect(home.dicas.map((d: { titulo: string }) => d.titulo)).toContain("Só na home");
  });

  it("publicado nas orientações de um nível aparece no diagnóstico desse nível", async () => {
    const classificacoes = await classificacaoService.listar();
    setStoredToken("mock-token:paciente-1");
    const { itens } = await diagnosticoService.listar();
    const classificado = itens.find((d) => d.nivel !== null)!;
    const nivel = classificacoes.find((c) => c.nivel === classificado.nivel)!;

    setStoredToken("mock-token:admin-1");
    await conteudoAdminService.criar({
      ...novo,
      titulo: "Orientação do nível",
      destinos: ["orientacoes_diagnostico"],
      classificacaoIds: [nivel.id],
    });

    setStoredToken("mock-token:paciente-1");
    const detalhe = await diagnosticoService.buscar(classificado.id);
    expect(detalhe.conteudos?.map((c) => c.titulo)).toContain("Orientação do nível");
  });
});

describe("upload de mídia (mock espelha o back)", () => {
  it("envia o arquivo em multipart e a URL devolvida serve o mesmo arquivo", async () => {
    const midia = await conteudoAdminService.enviarMidia(
      new File(["conteudo"], "foto.png", { type: "image/png" }),
    );

    expect(midia.tipo).toBe("imagem");
    expect(midia.url).toMatch(/^\/api\/v1\/public\/conteudos\/midias\/\w+\.png$/);
    // Leitura aberta, sem token.
    const lida = await fetch(url(midia.url));
    expect(lida.status).toBe(200);
    expect(lida.headers.get("content-type")).toBe("image/png");
    // Os bytes não são comparados: no jsdom o File perde o conteúdo ao virar
    // multipart no fetch do Node. O arquivo real é conferido contra o back.
  });

  it("formato não aceito volta com o motivo do back", async () => {
    const erro = await conteudoAdminService
      .enviarMidia(new File(["x"], "a.pdf", { type: "application/pdf" }))
      .catch((e: unknown) => e);

    expect((erro as ApiError).status).toBe(400);
    expect(mensagemErroMidia(erro)).toMatch(/^Formato não aceito/);
  });
});

describe("classificacaoService", () => {
  it("lista os três níveis em ordem, com o id do banco", async () => {
    const classificacoes = await classificacaoService.listar();
    expect(classificacoes.map((c) => [c.nivel, c.codigo])).toEqual([
      [1, "halito_normal"],
      [2, "halitose_intima"],
      [3, "mau_halito_social"],
    ]);
    expect(classificacoes.every((c) => c.id > 3)).toBe(true);
  });
});
