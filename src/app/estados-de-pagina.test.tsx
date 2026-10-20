import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import DiagnosticoPacientePage from "@/app/paciente/diagnosticos/[id]/page";
import DiagnosticoProfissionalPage from "@/app/profissional/diagnosticos/[id]/page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const url = (path: string) => `${config.apiBaseUrl}${path}`;

async function renderPagina(Pagina: typeof DiagnosticoPacientePage, id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense>
          <Pagina params={Promise.resolve({ id })} />
        </Suspense>
      </QueryClientProvider>,
    );
  });
}

/**
 * Regressão da TASK-209: as telas de detalhe não podem ficar em branco quando
 * o back responde erro (antes faziam `return null`).
 */
describe("estados de erro das telas de detalhe", () => {
  it("paciente: 404 vira 'não encontrado', sem botão de tentar de novo", async () => {
    server.use(
      http.get(url("/api/v1/diagnosticos/999"), () =>
        HttpResponse.json({ detail: "não encontrado" }, { status: 404 }),
      ),
    );
    await renderPagina(DiagnosticoPacientePage, "999");

    expect(await screen.findByRole("alert")).toHaveTextContent("Diagnóstico não encontrado");
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para meus diagnósticos" })).toBeInTheDocument();
  });

  it("paciente: falha do servidor oferece tentar de novo, e tentar busca outra vez", async () => {
    let chamadas = 0;
    server.use(
      http.get(url("/api/v1/diagnosticos/7"), () => {
        chamadas += 1;
        return HttpResponse.json({ detail: "erro" }, { status: 500 });
      }),
    );
    await renderPagina(DiagnosticoPacientePage, "7");

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await vi.waitFor(() => expect(chamadas).toBe(2));
  });

  it("profissional: diagnóstico de paciente sem vínculo (404) explica o motivo", async () => {
    server.use(
      http.get(url("/api/v1/diagnosticos/55"), () =>
        HttpResponse.json({ detail: "não encontrado" }, { status: 404 }),
      ),
      http.get(url("/api/v1/profissional/diagnosticos/55"), () =>
        HttpResponse.json({ detail: "não encontrado" }, { status: 404 }),
      ),
    );
    await renderPagina(DiagnosticoProfissionalPage, "55");

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Diagnóstico indisponível");
    expect(alerta).toHaveTextContent("não está vinculado a você");
  });
});
