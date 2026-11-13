import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
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
  it("seleciona todos os elegíveis carregados e exporta somente esses IDs", async () => {
    let corpo: unknown;
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          resposta([
            itemElegivel(101, "Primeiro"),
            itemElegivel(102, "Segundo"),
            itemElegivel(103, "Sem consentimento"),
            itemElegivel(104, "Somente IA"),
          ]),
        ),
      ),
      http.get(`${url}/:id`, async ({ params }) => {
        await delay(30);
        const id = Number(params.id);
        const detalhe = detalheElegivel(id, `Paciente ${id}`);
        return HttpResponse.json(
          id < 103
            ? detalhe
            : {
                ...detalhe,
                rotulo_dataset: {
                  ...detalhe.rotulo_dataset,
                  exportavel: false,
                  fonte_efetiva: id === 104 ? "ia" : "profissional",
                },
              },
        );
      }),
      http.post(`${config.apiBaseUrl}/api/v1/admin/datasets/exports`, async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({ detail: "falha" }, { status: 500 });
      }),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    expect(screen.queryByRole("button", { name: "Selecionar elegíveis" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    const selecionar = screen.getByRole("button", { name: "Selecionar elegíveis" });
    await waitFor(() => expect(selecionar).toBeEnabled());
    await userEvent.click(selecionar);
    expect(screen.getByText("2 selecionado(s)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Sem consentimento/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Somente IA/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Primeiro/ }));
    expect(screen.getByText("1 selecionado(s)")).toBeInTheDocument();
    await userEvent.click(selecionar);
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));
    await screen.findByRole("alert");
    expect(corpo).toEqual({ diagnostico_ids: [101, 102] });
    await userEvent.click(screen.getByRole("button", { name: "Falha" }));
    expect(screen.getByText("0 selecionado(s)")).toBeInTheDocument();
  });

  it("não habilita seleção em lote sem elegíveis e aguarda a consulta de elegibilidade", async () => {
    let concluir!: () => void;
    const consulta = new Promise<void>((resolve) => {
      concluir = resolve;
    });
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Primeiro")]))),
      http.get(`${url}/101`, async () => {
        await consulta;
        const detalhe = detalheElegivel(101, "Primeiro");
        return HttpResponse.json({
          ...detalhe,
          rotulo_dataset: { ...detalhe.rotulo_dataset, exportavel: false },
        });
      }),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    const selecionar = screen.getByRole("button", { name: "Selecionar elegíveis" });
    expect(selecionar).toBeDisabled();
    concluir();
    await screen.findByText("Não elegível para exportação");
    expect(selecionar).toBeDisabled();
  });

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
    const { unmount } = renderPagina();

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

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Download iniciado: 1 diagnóstico(s).",
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:dataset");
  });

  it("impede selecionar registros sem imagem ou não concluídos, mesmo com rótulo humano", async () => {
    const semImagem = { ...itemElegivel(101, "Sem Imagem"), qtd_imagens: 0 };
    const processando = { ...itemElegivel(102, "Processando"), status: "processando" };
    let detalhes = 0;
    server.use(
      http.get(url, () => HttpResponse.json(resposta([semImagem, processando]))),
      http.get(`${url}/:id`, () => {
        detalhes++;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderPagina();
    await screen.findByText("Sem Imagem");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByRole("checkbox", { name: /Sem Imagem/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Processando/ })).toBeDisabled();
    expect(detalhes).toBe(0);
  });

  it("não bloqueia os outros itens quando uma consulta de elegibilidade falha", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json(resposta([itemElegivel(101, "Primeiro"), itemElegivel(102, "Segundo")])),
      ),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Primeiro"))),
      http.get(`${url}/102`, () => new HttpResponse(null, { status: 500 })),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Primeiro/ })).toBeEnabled());
    expect(await screen.findByText("Não foi possível verificar")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Segundo/ })).toBeDisabled();
  });

  it.each([
    [
      { detail: "exportação de dataset indisponível" },
      "A exportação de dataset está indisponível",
      "1 selecionado(s)",
    ],
    [
      { detail: { mensagem: "não elegível", diagnostico_ids: [101] } },
      "A elegibilidade mudou",
      "0 selecionado(s)",
    ],
  ])("trata o conflito do backend e mantém o estado coerente", async (body, mensagem, contador) => {
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Primeiro")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Primeiro"))),
      http.post(`${config.apiBaseUrl}/api/v1/admin/datasets/exports`, () =>
        HttpResponse.json(body, { status: 409 }),
      ),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    const checkbox = screen.getByRole("checkbox", { name: /Primeiro/ });
    await waitFor(() => expect(checkbox).toBeEnabled());
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(screen.getByText(contador)).toBeInTheDocument();
  });

  it.each([
    [401, "Sua sessão expirou"],
    [403, "Você não tem permissão"],
    [413, "A seleção excede o limite"],
    [503, "Erro temporário"],
  ])("informa erro %i e mantém a seleção para revisão", async (status, mensagem) => {
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Primeiro")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Primeiro"))),
      http.post(`${config.apiBaseUrl}/api/v1/admin/datasets/exports`, () =>
        HttpResponse.json({ detail: "erro" }, { status }),
      ),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    const checkbox = screen.getByRole("checkbox", { name: /Primeiro/ });
    await waitFor(() => expect(checkbox).toBeEnabled());
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(checkbox).toBeChecked();
  });

  it("bloqueia mudanças na seleção e filtros enquanto o arquivo é gerado", async () => {
    let requisicoes = 0;
    server.use(
      http.get(url, () => HttpResponse.json(resposta([itemElegivel(101, "Primeiro")]))),
      http.get(`${url}/101`, () => HttpResponse.json(detalheElegivel(101, "Primeiro"))),
      http.post(`${config.apiBaseUrl}/api/v1/admin/datasets/exports`, async () => {
        requisicoes++;
        await delay(250);
        return HttpResponse.json({ detail: "falha" }, { status: 500 });
      }),
    );
    renderPagina();
    await screen.findByText("Primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    const checkbox = screen.getByRole("checkbox", { name: /Primeiro/ });
    await waitFor(() => expect(checkbox).toBeEnabled());
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: "Exportar dataset" }));
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar seleção" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Selecionar elegíveis" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Falha" })).toBeDisabled();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível gerar");
    expect(checkbox).toBeChecked();
    expect(requisicoes).toBe(1);
  });
});
