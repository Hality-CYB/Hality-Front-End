import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import PacientesPage from "@/app/profissional/pacientes/page";

const url = `${config.apiBaseUrl}/api/v1/pacientes`;

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
      <PacientesPage />
    </QueryClientProvider>,
  );
}

describe("Lista de pacientes do profissional", () => {
  it("avisa quando a consulta falha e permite tentar novamente", async () => {
    let falhar = true;
    server.use(
      http.get(url, () => {
        if (falhar) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          itens: [
            {
              id: "paciente-1",
              nome: "Ana Paula Ferreira",
              email: "ana@example.com",
              telefone: null,
              data_nascimento: null,
              ativo: true,
              total_diagnosticos: 1,
              ultimo_diagnostico_em: "2026-08-12T00:00:00.000Z",
              ultimo_nivel: 2,
            },
          ],
          pagina: 1,
          limite: 20,
          total: 1,
          total_paginas: 1,
        });
      }),
    );
    renderPagina();

    expect(await screen.findByText("Não foi possível carregar os pacientes")).toBeInTheDocument();

    falhar = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar os pacientes")).not.toBeInTheDocument();
  });
});
