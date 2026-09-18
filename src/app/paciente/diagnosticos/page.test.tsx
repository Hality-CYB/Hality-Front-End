import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import DiagnosticosPage from "@/app/paciente/diagnosticos/page";

const url = `${config.apiBaseUrl}/api/v1/diagnosticos`;

const ITENS = [
  {
    id: 187,
    data_diagnostico: "2026-09-18T12:00:00Z",
    status: "concluido",
    classificacao: { codigo: "halito_normal", nome_exibicao: "Hálito Normal", ordem: 1 },
    escala_saburra: 24,
  },
  {
    id: 189,
    data_diagnostico: "2026-09-17T12:00:00Z",
    status: "processando",
    classificacao: null,
    escala_saburra: null,
  },
  {
    id: 190,
    data_diagnostico: "2026-09-16T12:00:00Z",
    status: "falha",
    classificacao: null,
    escala_saburra: null,
  },
];

function mockListagem(limitePorPagina = 2) {
  const consultas: URLSearchParams[] = [];
  server.use(
    http.get(url, ({ request }) => {
      const params = new URL(request.url).searchParams;
      consultas.push(params);
      const pagina = Number(params.get("pagina") ?? 1);
      const limite = params.get("limite") === "1" ? 1 : limitePorPagina;
      const itens = params.get("data_inicio") ? ITENS.slice(0, 1) : ITENS;
      return HttpResponse.json({
        itens: itens.slice((pagina - 1) * limite, pagina * limite),
        pagina,
        limite,
        total: itens.length,
        total_paginas: Math.ceil(itens.length / limite),
      });
    }),
  );
  return consultas;
}

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DiagnosticosPage />
    </QueryClientProvider>,
  );
}

describe("Meus diagnósticos", () => {
  it("mostra o total, o nível dos concluídos e o status dos que não têm resultado", async () => {
    mockListagem(20);
    renderPagina();

    expect(await screen.findByText("3 exames realizados")).toBeInTheDocument();
    expect(screen.getByText("Hálito Normal")).toBeInTheDocument();
    expect(screen.getByText("Aguardando análise")).toBeInTheDocument();
    expect(screen.getByText("Falha na análise")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });

  it("carrega a próxima página sob demanda e esconde o botão na última", async () => {
    const consultas = mockListagem(2);
    renderPagina();

    await screen.findByText("Hálito Normal");
    expect(screen.queryByText("Falha na análise")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Falha na análise")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(consultas.some((q) => q.get("pagina") === "2")).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument(),
    );
  });

  it("filtra o período no servidor e mantém o total geral no cabeçalho", async () => {
    const consultas = mockListagem(20);
    renderPagina();
    await screen.findByText("Falha na análise");

    await userEvent.click(screen.getByRole("button", { name: "7 dias" }));

    await waitFor(() => expect(screen.queryByText("Falha na análise")).not.toBeInTheDocument());
    expect(screen.getByText("Hálito Normal")).toBeInTheDocument();
    expect(screen.getByText("3 exames realizados")).toBeInTheDocument();
    expect(consultas.some((q) => q.has("data_inicio") && !q.has("data_fim"))).toBe(true);
    expect(consultas.every((q) => !q.has("pacienteId"))).toBe(true);
  });

  it("sem nenhum diagnóstico, mostra o estado vazio", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ itens: [], pagina: 1, limite: 20, total: 0, total_paginas: 0 }),
      ),
    );
    renderPagina();

    expect(await screen.findByText("Nenhum diagnóstico")).toBeInTheDocument();
  });
});
