import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import UsuariosPage from "./page";
import { config } from "@/lib/config";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
afterEach(() => {
  cleanup();
  clearStoredToken();
});

it("mantém os estados ativo, convite pendente e bloqueado distintos na lista", async () => {
  setStoredToken("mock-token:admin-1");
  const itens = [
    { id: "ativo", nome: "Conta Ativa", ativo: true, convite_pendente: false },
    { id: "convite", nome: "Conta Convidada", ativo: false, convite_pendente: true },
    { id: "bloqueado", nome: "Conta Bloqueada", ativo: false, convite_pendente: false },
  ].map((item) => ({
    ...item,
    email: `${item.id}@example.com`,
    telefone: null,
    role: "paciente",
    created_at: "2026-10-20T00:00:00Z",
    profissional: null,
  }));
  server.use(
    http.get(`${config.apiBaseUrl}/api/v1/admin/usuarios`, () =>
      HttpResponse.json({ itens, pagina: 1, limite: 20, total: 3, total_paginas: 1 }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UsuariosPage />
    </QueryClientProvider>,
  );
  const convite = within(await screen.findByRole("link", { name: /Conta Convidada/ }));
  expect(convite.getByText("Convite pendente")).toBeInTheDocument();
  expect(convite.queryByText("Bloqueado")).not.toBeInTheDocument();
  const bloqueado = within(screen.getByRole("link", { name: /Conta Bloqueada/ }));
  expect(bloqueado.getByText("Bloqueado")).toBeInTheDocument();
  expect(bloqueado.queryByText("Convite pendente")).not.toBeInTheDocument();
  const ativo = within(screen.getByRole("link", { name: /Conta Ativa/ }));
  expect(ativo.queryByText("Convite pendente")).not.toBeInTheDocument();
  expect(ativo.queryByText("Bloqueado")).not.toBeInTheDocument();
});
