import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import { usuarioMockParaLogin, SENHA_MOCK } from "@/services/mocks/auth-handlers";
import { usuarioService } from "@/services/usuario-service";
import { vinculoService } from "@/services/vinculo-service";
import { diagnosticoService } from "@/services/diagnostico-service";
import { dicaService } from "@/services/dica-service";
import { adaptBackendConteudoAdmin, type BackendConteudoAdmin } from "@/types/dica";

/**
 * Services do admin (`/admin/*`). Os testes de contrato interceptam a chamada;
 * os de regra rodam contra o mock MSW, que espelha o back.
 */

const url = (path: string) => `${config.apiBaseUrl}${path}`;

beforeEach(() => setStoredToken("mock-token:admin-1"));
afterEach(() => clearStoredToken());

describe("usuarioService (admin)", () => {
  it("manda filtros e paginação na query e adapta a página", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/admin/usuarios"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          itens: [
            {
              id: "u-1",
              nome: "Ana",
              email: "ana@x.com",
              telefone: null,
              role: "profissional",
              ativo: false,
              created_at: "2026-10-01T00:00:00Z",
              profissional: {
                registro_profissional: "CRO 1",
                especialidade: null,
                vinculado_hality: true,
              },
            },
          ],
          pagina: 2,
          limite: 20,
          total: 21,
          total_paginas: 2,
        });
      }),
    );

    const pagina = await usuarioService.listarAdmin({
      pagina: 2,
      limite: 20,
      role: "profissional",
      busca: "  ana ",
    });

    expect(Object.fromEntries(query!)).toEqual({
      pagina: "2",
      limite: "20",
      role: "profissional",
      busca: "ana",
    });
    expect(pagina).toMatchObject({ pagina: 2, total: 21, totalPaginas: 2 });
    expect(pagina.itens[0]).toMatchObject({
      nome: "Ana",
      ativo: false,
      perfilProfissional: { registro: "CRO 1", especialidade: null, vinculadoHality: true },
    });
  });

  it("criar só manda dados profissionais quando o papel é profissional", async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(url("/api/v1/admin/usuarios"), async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(
          {
            id: "novo",
            nome: "X",
            email: "x@x.com",
            telefone: null,
            role: "paciente",
            ativo: true,
            created_at: "2026-10-01T00:00:00Z",
            profissional: null,
          },
          { status: 201 },
        );
      }),
    );
    const profissional = { registro: "CRO 9", especialidade: "", vinculadoHality: false };

    await usuarioService.criarAdmin({
      nome: " X ",
      email: "x@x.com",
      role: "paciente",
      senha: "12345678",
      profissional,
    });
    await usuarioService.criarAdmin({
      nome: "Y",
      email: "y@x.com",
      telefone: "",
      role: "profissional",
      senha: "12345678",
      profissional,
    });

    expect(corpos[0]).toEqual({
      nome: "X",
      email: "x@x.com",
      telefone: null,
      role: "paciente",
      senha: "12345678",
    });
    expect(corpos[1]).toMatchObject({
      profissional: {
        registro_profissional: "CRO 9",
        especialidade: null,
        vinculado_hality: false,
      },
    });
  });

  it("no mock, não deixa desativar o último admin ativo (409)", async () => {
    await expect(usuarioService.atualizarAdmin("admin-1", { ativo: false })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("no mock, usuário bloqueado não consegue entrar", async () => {
    const criado = await usuarioService.criarAdmin({
      nome: "Bloqueável",
      email: "bloqueavel@x.com",
      role: "paciente",
      senha: "12345678",
    });
    expect(usuarioMockParaLogin("bloqueavel@x.com", SENHA_MOCK)).not.toBeNull();

    await usuarioService.atualizarAdmin(criado.id, { ativo: false });

    expect(usuarioMockParaLogin("bloqueavel@x.com", SENHA_MOCK)).toBeNull();
  });
});

describe("vinculoService", () => {
  it("vincular o mesmo par duas vezes dá 409; encerrado, pode vincular de novo", async () => {
    const vinculo = await vinculoService
      .criar({
        pacienteId: "paciente-1",
        profissionalId: "profissional-2-teste",
      })
      .catch((e: unknown) => e);
    // profissional inexistente → 422
    expect(vinculo).toMatchObject({ status: 422 });

    const novoProfissional = await usuarioService.criarAdmin({
      nome: "Dr. Teste",
      email: "dr.teste@x.com",
      role: "profissional",
      senha: "12345678",
    });
    const criado = await vinculoService.criar({
      pacienteId: "paciente-1",
      profissionalId: novoProfissional.id,
    });
    expect(criado).toMatchObject({ ativo: true, profissionalNome: "Dr. Teste" });

    await expect(
      vinculoService.criar({ pacienteId: "paciente-1", profissionalId: novoProfissional.id }),
    ).rejects.toMatchObject({ status: 409 });

    await vinculoService.encerrar(criado.id);
    const encerrados = await vinculoService.listar({
      pacienteId: "paciente-1",
      profissionalId: novoProfissional.id,
    });
    expect(encerrados.itens[0]).toMatchObject({ ativo: false });
    expect(encerrados.itens[0]?.encerradoEm).not.toBeNull();

    const reativado = await vinculoService.criar({
      pacienteId: "paciente-1",
      profissionalId: novoProfissional.id,
    });
    expect(reativado).toMatchObject({ id: criado.id, ativo: true, encerradoEm: null });
  });
});

describe("diagnosticoService (admin)", () => {
  it("filtra a classificação pelo código e converte a confiança para porcentagem", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/admin/diagnosticos"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ itens: [], pagina: 1, limite: 20, total: 0, total_paginas: 0 });
      }),
      http.get(url("/api/v1/admin/diagnosticos/7"), () =>
        HttpResponse.json({
          id: 7,
          paciente_id: "p-1",
          data_diagnostico: "2026-10-01T10:00:00Z",
          status: "concluido",
          erro: null,
          automatica: {
            classificacao: {
              codigo: "halitose_intima",
              nome_exibicao: "Halitose Íntima",
              ordem: 2,
            },
            escala_saburra: 40,
            confianca_ia: 0.87,
          },
          revisao: {
            profissional_revisor_id: "prof-1",
            data_revisao: "2026-10-02T10:00:00Z",
            observacoes: "ok",
          },
          dataset: { disponivel: false, motivo: "indisponível" },
          anamnese_id: 3,
          qtd_imagens: 1,
        }),
      ),
    );

    await diagnosticoService.listarAdmin({ classificacao: 3, status: "concluido" });
    const detalhe = await diagnosticoService.buscarAdmin("7");

    expect(query?.get("classificacao")).toBe("mau_halito_social");
    expect(query?.get("status")).toBe("concluido");
    expect(detalhe).toMatchObject({
      nivelIA: 2,
      confiancaIA: 87,
      escalaSaburra: 40,
      revisao: { revisorId: "prof-1", observacoes: "ok" },
      anamneseId: "3",
    });
  });
});

describe("dicaService e adaptBackendConteudoAdmin", () => {
  const base: BackendConteudoAdmin = {
    id: 1,
    titulo: "T",
    categoria: "tratamento",
    conteudo: { itens: [{ tipo: "texto", texto: "Oi" }] },
    classificacao_ids: [13],
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

  it("reconhece texto, imagem e blocos que o editor não monta", () => {
    expect(adaptBackendConteudoAdmin(base)).toMatchObject({ formato: "texto", corpo: "Oi" });
    expect(
      adaptBackendConteudoAdmin({
        ...base,
        conteudo: { itens: [{ tipo: "imagem", url: "https://x/a.png", legenda: "L" }] },
      }),
    ).toMatchObject({ formato: "imagem", corpo: "L", midiaUrl: "https://x/a.png" });
    expect(
      adaptBackendConteudoAdmin({
        ...base,
        conteudo: { itens: [{ tipo: "protocolo_tratamento", descricao: "Mensal" }] },
      }),
    ).toMatchObject({ formato: "outro", corpo: "Mensal", classificacaoIds: [13] });
  });

  it("na edição sem formato, não reescreve o corpo; publicar vira status", async () => {
    let corpo: unknown;
    server.use(
      http.patch(url("/api/v1/admin/conteudos/1"), async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({ ...base, status: "publicado" });
      }),
    );

    await dicaService.atualizar("1", { titulo: " Novo ", publicado: true, ordem: 2 });

    expect(corpo).toEqual({ titulo: "Novo", status: "publicado", ordem: 2 });
  });

  it("no mock, o conteúdo criado e publicado na home aparece no GET /home", async () => {
    await dicaService.criar({
      titulo: "Dica nova do admin",
      categoria: "higiene",
      formato: "texto",
      corpo: "Texto",
      mostrarNaHome: true,
      publicado: true,
      ordem: 0,
    });

    setStoredToken("mock-token:paciente-1");
    const home = await fetch(url("/api/v1/home"), {
      headers: { Authorization: "Bearer mock-token:paciente-1" },
    }).then((r) => r.json());

    expect(home.dicas.map((d: { titulo: string }) => d.titulo)).toContain("Dica nova do admin");
  });
});
