import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import { usuarioMockParaLogin, SENHA_MOCK } from "@/services/mocks/auth-handlers";
import { usuarioService } from "@/services/usuario-service";
import { vinculoService } from "@/services/vinculo-service";
import { diagnosticoService } from "@/services/diagnostico-service";
import { adminService } from "@/services/admin-service";

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
      // Senha definida na hora: conta ativa, sem convite (o padrão do back desde a #163 é convidar).
      enviar_convite: false,
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
  const classificacao = (ordem: 1 | 2 | 3) => ({
    codigo: ["halito_normal", "halitose_intima", "mau_halito_social"][ordem - 1],
    nome_exibicao: "x",
    ordem,
  });
  const revisaoConcluida = {
    status: "concluida",
    profissional_revisor_id: "prof-1",
    profissional_revisor_nome: "Dra. Ana",
    data_revisao: "2026-10-02T10:00:00Z",
    classificacao: classificacao(3),
    observacoes: "ok",
  };
  const item = {
    id: 7,
    paciente_id: "p-1",
    paciente: { id: "p-1", nome: "Carla" },
    data: "2026-10-01T10:00:00Z",
    status: "concluido",
    automatica: { classificacao: classificacao(2), escala_saburra: 40, confianca_ia: 0.87 },
    revisao: revisaoConcluida,
    qtd_imagens: 1,
  };

  it("filtra a classificação pelo código e mostra o nível revisado no lugar do da IA", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/admin/diagnosticos"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          itens: [
            item,
            {
              ...item,
              id: 8,
              status: "aguardando_revisao",
              revisao: {
                status: "pendente",
                profissional_revisor_id: null,
                profissional_revisor_nome: null,
                data_revisao: null,
                classificacao: null,
                observacoes: null,
              },
            },
          ],
          pagina: 1,
          limite: 20,
          total: 2,
          total_paginas: 1,
        });
      }),
    );

    const pagina = await diagnosticoService.listarAdmin({ classificacao: 3, status: "concluido" });

    expect(query?.get("classificacao")).toBe("mau_halito_social");
    expect(query?.get("status")).toBe("concluido");
    expect(pagina.itens[0]).toMatchObject({
      pacienteNome: "Carla",
      nivel: 3,
      nivelIA: 2,
      nivelCorrigido: true,
      revisao: { revisado: true, revisorNome: "Dra. Ana", nivel: 3 },
    });
    expect(pagina.itens[1]).toMatchObject({
      nivel: 2,
      nivelIA: 2,
      nivelCorrigido: false,
      revisao: { revisado: false, nivel: null },
    });
  });

  it("no detalhe, converte a confiança e traz o histórico com o nome do revisor", async () => {
    server.use(
      http.get(url("/api/v1/admin/diagnosticos/7"), () =>
        HttpResponse.json({
          ...item,
          erro: null,
          historico_revisoes: [
            {
              profissional_revisor_id: "prof-1",
              profissional_revisor_nome: "Dra. Ana",
              data_revisao: "2026-10-02T10:00:00Z",
              classificacao: classificacao(3),
              observacoes: "ok",
            },
          ],
          dataset: { disponivel: false, motivo: "exportacao_fora_do_escopo" },
          imagem: { disponivel: false, motivo: "politica_de_acesso_pendente" },
          anamnese_id: null,
        }),
      ),
    );

    const detalhe = await diagnosticoService.buscarAdmin("7");

    expect(detalhe).toMatchObject({
      pacienteNome: "Carla",
      nivel: 3,
      nivelIA: 2,
      confiancaIA: 87,
      escalaSaburra: 40,
      anamneseId: null,
      historico: [{ revisorNome: "Dra. Ana", nivel: 3 }],
    });
  });

  it("no mock, a revisão do profissional vira o nível do admin", async () => {
    const pagina = await diagnosticoService.listarAdmin({ limite: 50 });
    const revisado = pagina.itens.find((d) => d.revisao.revisado);
    expect(revisado?.pacienteNome).not.toBe("");
    expect(revisado?.nivel).toBe(revisado?.revisao.nivel ?? revisado?.nivelIA);
  });
});

describe("adminService.resumo", () => {
  it("manda o fuso e adapta os números do período", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(url("/api/v1/admin/resumo"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          periodo: { inicio: "2026-09-15T00:00:00Z", fim: "2026-10-15T00:00:00Z", timezone: "UTC" },
          diagnosticos: {
            total: 9,
            por_classificacao: { "11": 4, sem_classificacao: 5 },
            por_status: { concluido: 3, aguardando_revisao: 6 },
          },
          revisao: { pendentes: 6, revisados: 3 },
          halitose: null,
        });
      }),
    );

    const resumo = await adminService.resumo();

    expect(query?.get("timezone")).toBeTruthy();
    expect(resumo).toMatchObject({ totalDiagnosticos: 9, pendentes: 6, revisados: 3 });
  });
});
