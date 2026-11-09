import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import DiagnosticosAdminPage from "@/app/admin/diagnosticos/page";

const url = `${config.apiBaseUrl}/api/v1/admin/diagnosticos`;

function item(
  id: number,
  nome: string,
  status: string,
  classificacao: { codigo: string; nome_exibicao: string; ordem: number } | null,
) {
  return {
    id,
    paciente_id: `paciente-${id}`,
    paciente: { id: `paciente-${id}`, nome },
    data: "2026-09-18T12:00:00Z",
    status,
    automatica: { classificacao, escala_saburra: null, confianca_ia: null },
    revisao: {
      status: "pendente",
      profissional_revisor_id: null,
      profissional_revisor_nome: null,
      data_revisao: null,
      classificacao: null,
      observacoes: null,
    },
    qtd_imagens: 1,
  };
}

function itemElegivel(id: number, nome: string) {
  return {
    ...item(id, nome, "concluido", NORMAL),
    rotulo_dataset: {
      fonte_efetiva: "profissional",
      exportavel: true,
      motivo: null,
    },
  };
}

function detalheElegivel(id: number, nome: string) {
  return {
    ...itemElegivel(id, nome),
    historico_revisoes: [],
    dataset: { disponivel: false, motivo: "exportacao_fora_do_escopo" },
    rotulo_dataset: {
      atual: null,
      historico: [],
      fonte_efetiva: "profissional",
      exportavel: true,
      motivo: null,
    },
    imagem: { disponivel: false, motivo: "politica_de_acesso_pendente" },
    reclassificacao: { version: 1, revisada_por_profissional: true },
    erro: null,
    anamnese_id: null,
  };
}

const INTIMA = { codigo: "halitose_intima", nome_exibicao: "Halitose Íntima", ordem: 2 };
const NORMAL = { codigo: "halito_normal", nome_exibicao: "Hálito Normal", ordem: 1 };

const ITENS = [
  item(101, "Ana Paula Ferreira", "aguardando_revisao", INTIMA),
  item(102, "Julia Costa", "processando", null),
  item(103, "Carlos Mendes", "concluido", NORMAL),
];

function resposta(itens: unknown[], limite = 20) {
  return {
    itens: itens.slice(0, limite),
    pagina: 1,
    limite,
    total: itens.length,
    total_paginas: Math.ceil(itens.length / limite),
  };
}

// responde como o back, usando os filtros que a tela manda
function mockListagem() {
  const consultas: URLSearchParams[] = [];
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      consultas.push(params);
      const filtrados = ITENS.filter(
        (i) => !params.get("status") || i.status === params.get("status"),
      )
        .filter(
          (i) => params.get("sem_classificacao") !== "true" || i.automatica.classificacao === null,
        )
        .filter(
          (i) =>
            !params.get("classificacao") ||
            i.automatica.classificacao?.codigo === params.get("classificacao"),
        );
      return HttpResponse.json(resposta(filtrados, Number(params.get("limite") ?? 20)));
    }),
  );
  return consultas;
}

// o teste não tem IntersectionObserver, então crio um falso
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DiagnosticosAdminPage />
    </QueryClientProvider>,
  );
}

describe("Fila de diagnósticos do admin", () => {
  it("mostra os diagnósticos e as contagens", async () => {
    mockListagem();
    renderPagina();

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Julia Costa")).toBeInTheDocument();
    expect(screen.getByText("Carlos Mendes")).toBeInTheDocument();
    expect(await screen.findByText("3 diagnósticos · 1 aguardando revisão")).toBeInTheDocument();
  });

  it("filtra por status no servidor", async () => {
    const consultas = mockListagem();
    renderPagina();
    await screen.findByText("Julia Costa");

    await userEvent.click(screen.getByRole("button", { name: "Aguardando revisão" }));

    await waitFor(() => expect(screen.queryByText("Julia Costa")).not.toBeInTheDocument());
    expect(screen.getByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(consultas.some((q) => q.get("status") === "aguardando_revisao")).toBe(true);
  });

  it("filtra pelo nível da IA ao tocar no quadrado", async () => {
    const consultas = mockListagem();
    renderPagina();
    await screen.findByText("Julia Costa");

    const botao = screen.getByRole("button", { name: /Íntima/ });
    await userEvent.click(botao);

    await waitFor(() => expect(screen.queryByText("Carlos Mendes")).not.toBeInTheDocument());
    expect(screen.getByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(botao).toHaveAttribute("aria-pressed", "true");
    expect(consultas.some((q) => q.get("classificacao") === "halitose_intima")).toBe(true);
  });

  it("filtra os que ainda não têm classificação", async () => {
    const consultas = mockListagem();
    renderPagina();
    await screen.findByText("Ana Paula Ferreira");

    await userEvent.click(screen.getByRole("button", { name: /Sem classificação/ }));

    await waitFor(() => expect(screen.queryByText("Ana Paula Ferreira")).not.toBeInTheDocument());
    expect(screen.getByText("Julia Costa")).toBeInTheDocument();
    expect(consultas.some((q) => q.get("sem_classificacao") === "true")).toBe(true);
  });

  it("sem nenhum resultado, mostra o estado vazio", async () => {
    server.use(http.get(url, () => HttpResponse.json(resposta([]))));
    renderPagina();

    expect(await screen.findByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("se a lista falhar, avisa e deixa tentar de novo", async () => {
    let falhar = true;
    server.use(
      http.get(url, ({ request }) => {
        if (falhar) return new HttpResponse(null, { status: 500 });
        const limite = Number(new URL(request.url).searchParams.get("limite") ?? 20);
        return HttpResponse.json(resposta(ITENS, limite));
      }),
    );
    renderPagina();

    expect(
      await screen.findByText("Não foi possível carregar os diagnósticos."),
    ).toBeInTheDocument();

    falhar = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(
      screen.queryByText("Não foi possível carregar os diagnósticos."),
    ).not.toBeInTheDocument();
  });

  it("sem permissão, avisa e não oferece tentar de novo", async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 403 })));
    renderPagina();

    expect(
      await screen.findByText("Você não tem permissão para ver os diagnósticos."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("seleciona somente diagnósticos elegíveis dentro do card", async () => {
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Ana Paula Ferreira")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Ana Paula Ferreira"))),
    );
    renderPagina();

    await screen.findByText("Ana Paula Ferreira");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));

    const checkbox = screen.getByRole("checkbox", {
      name: "Selecionar diagnóstico de Ana Paula Ferreira, 101",
    });
    expect(checkbox.closest(".diag-list-card")).not.toBeNull();
    await userEvent.click(checkbox);
    expect(screen.getByText("1 selecionado(s)")).toBeInTheDocument();
  });

  it("mantém a seleção e mostra erro quando o export falha", async () => {
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Ana Paula Ferreira")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Ana Paula Ferreira"))),
      http.post(`${config.apiBaseUrl}/api/v1/admin/datasets/exports`, () =>
        HttpResponse.json({ detail: "storage" }, { status: 500 }),
      ),
    );
    renderPagina();

    await screen.findByText("Ana Paula Ferreira");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Selecionar diagnóstico de Ana Paula Ferreira, 101",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível gerar o arquivo. Tente novamente.",
    );
    expect(screen.getByText("1 selecionado(s)")).toBeInTheDocument();
  });

  it("baixa o ZIP e revoga o Object URL após sucesso", async () => {
    const createObjectURL = vi.fn(() => "blob:dataset");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Ana Paula Ferreira")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Ana Paula Ferreira"))),
      http.post(
        `${config.apiBaseUrl}/api/v1/admin/datasets/exports`,
        () =>
          new HttpResponse(new Uint8Array([80, 75, 3, 4]), {
            status: 200,
            headers: { "Content-Type": "application/zip" },
          }),
      ),
    );
    renderPagina();

    await screen.findByText("Ana Paula Ferreira");
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Selecionar diagnóstico de Ana Paula Ferreira, 101",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));

    expect(await screen.findByRole("status")).toHaveTextContent("1 diagnóstico(s) baixado(s).");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:dataset");
    expect(click).toHaveBeenCalledOnce();
  });
});
