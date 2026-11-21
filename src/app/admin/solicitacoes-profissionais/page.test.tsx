import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";
import SolicitacoesProfissionaisPage from "./page";

const BASE_URL = `${config.apiBaseUrl}/api/v1/admin/solicitacoes-profissionais`;
const SOLICITACAO = {
  id: "solicitacao",
  nome: "Profissional Teste",
  email: "profissional@example.com",
  telefone: null,
  registro_profissional: "CRO-RS 12345",
  especialidade: "Odontologia",
  status: "pendente",
  created_at: "2026-11-21T10:00:00Z",
  decidido_em: null,
  usuario_id: null,
};

function preparar() {
  setStoredToken("mock-token:admin-1");
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SolicitacoesProfissionaisPage />
    </QueryClientProvider>,
  );
}

it.each(["aprovada", "recusada"])(
  "confirma a decisão %s e atualiza a fila sem duplicar",
  async (resultado) => {
    let status = "pendente";
    const decidir = vi.fn();
    server.use(
      http.get(BASE_URL, ({ request }) =>
        HttpResponse.json({
          itens:
            new URL(request.url).searchParams.get("status") === status
              ? [{ ...SOLICITACAO, status }]
              : [],
          total: status === "pendente" ? 1 : 0,
          pagina: 1,
          total_paginas: 1,
        }),
      ),
      http.post(`${BASE_URL}/solicitacao/decisao`, async ({ request }) => {
        decidir(await request.json());
        status = resultado;
        return HttpResponse.json({ ...SOLICITACAO, status });
      }),
    );
    preparar();
    expect(await screen.findByText("CRO-RS 12345")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", {
        name: resultado === "aprovada" ? "Aprovar" : "Recusar",
      }),
    );
    expect(decidir).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }),
    );
    expect(decidir).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", {
        name: resultado === "aprovada" ? "Aprovar" : "Recusar",
      }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: /Confirmar/ }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      resultado === "aprovada" ? "aprovada" : "recusada",
    );
    expect(await screen.findByText("Nenhuma solicitação encontrada")).toBeInTheDocument();
    expect(decidir).toHaveBeenCalledExactlyOnceWith({ decisao: resultado });
  },
);

it("mantém o modal aberto e informa conflito sem anunciar sucesso", async () => {
  server.use(
    http.get(BASE_URL, () =>
      HttpResponse.json({ itens: [SOLICITACAO], total: 1, pagina: 1, total_paginas: 1 }),
    ),
    http.post(`${BASE_URL}/solicitacao/decisao`, () =>
      HttpResponse.json({ detail: "Conflito" }, { status: 409 }),
    ),
  );
  preparar();
  await userEvent.click(await screen.findByRole("button", { name: "Aprovar" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("já foi decidida");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});
