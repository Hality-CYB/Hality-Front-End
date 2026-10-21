import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import EsqueciSenhaPage from "./page";
import { server } from "@/services/mocks/server";
import { config } from "@/lib/config";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
const endpoint = `${config.apiBaseUrl}/api/v1/auth/password-recovery`;
function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EsqueciSenhaPage />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("valida vazio e e-mail inválido sem fazer requisição", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  renderPage();
  expect(screen.queryByText("CHECK YOUR BREATH")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Hality/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
  expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "inválido" } });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("mostra loading e mensagem genérica apenas depois do 202", async () => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.post(endpoint, async () => {
      await pending;
      return HttpResponse.json(
        { message: "Se o endereço estiver cadastrado, enviaremos instruções." },
        { status: 202 },
      );
    }),
  );
  renderPage();
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
  expect(await screen.findByRole("button", { name: "Solicitando…" })).toBeDisabled();
  expect(screen.queryByText(/Se o endereço estiver cadastrado/)).not.toBeInTheDocument();
  release();
  expect(await screen.findByRole("status")).toHaveTextContent("Se o endereço estiver cadastrado");
  expect(screen.queryByRole("link", { name: /Redefinir senha/ })).not.toBeInTheDocument();
});

it.each([false, true])(
  "expõe retry manual para rede e mantém o e-mail (offline=%s)",
  async (offline) => {
    let attempts = 0;
    server.use(
      http.post(endpoint, () =>
        ++attempts === 1
          ? HttpResponse.error()
          : HttpResponse.json({ message: "Aceito" }, { status: 202 }),
      ),
    );
    renderPage();
    act(() => onlineManager.setOnline(!offline));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("conectar ao servidor");
    expect(attempts).toBe(1);
    expect(screen.getByLabelText("E-mail")).toHaveValue("pessoa@example.com");
    await act(async () => onlineManager.setOnline(true));
    expect(attempts).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("status");
    expect(attempts).toBe(2);
  },
);

it("não confirma envio após 503 e permite retry manual preservando o e-mail", async () => {
  let attempts = 0;
  server.use(
    http.post(endpoint, () =>
      ++attempts === 1
        ? HttpResponse.json({ detail: "database unavailable" }, { status: 503 })
        : HttpResponse.json({ message: "Solicitação aceita" }, { status: 202 }),
    ),
  );
  renderPage();
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByLabelText("E-mail")).toHaveValue("pessoa@example.com");
  expect(document.body.textContent).not.toContain("database unavailable");
  expect(attempts).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Se o endereço estiver cadastrado");
  expect(attempts).toBe(2);
});

it("respeita Retry-After quando infraestrutura responder 429", async () => {
  server.use(
    http.post(endpoint, () =>
      HttpResponse.json({ detail: "limite" }, { status: 429, headers: { "Retry-After": "1" } }),
    ),
  );
  renderPage();
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperação" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
  expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeDisabled();
  await waitFor(
    () => expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled(),
    { timeout: 2500 },
  );
});
