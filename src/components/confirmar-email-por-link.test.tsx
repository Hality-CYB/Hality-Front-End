import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { EntradaPorLink } from "@/components/definir-senha-form";
import { config } from "@/lib/config";
import { clearStoredToken, getStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const TOKEN = "token-de-verificacao-somente-para-testes";
const urlConfirmar = `${config.apiBaseUrl}/api/v1/auth/email-verification/confirm`;
const urlReenviar = `${config.apiBaseUrl}/api/v1/auth/email-verification/resend`;

function abrirLink(query = `?purpose=email_verification&token=${TOKEN}`) {
  window.history.replaceState({}, "", `/${query}`);
  return render(
    <StrictMode>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <EntradaPorLink>
          <p>Landing</p>
        </EntradaPorLink>
      </QueryClientProvider>
    </StrictMode>,
  );
}

beforeEach(() => mockReplace.mockClear());

afterEach(() => {
  cleanup();
  clearStoredToken();
  window.history.replaceState({}, "", "/");
});

describe("confirmação de e-mail pelo link", () => {
  it("link válido confirma uma única vez e vai direto para /login, sem sessão nem token na URL", async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(urlConfirmar, async ({ request }) => {
        corpos.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    abrirLink();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(corpos).toEqual([{ token: TOKEN }]);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(getStoredToken()).toBeNull();
  });

  it("link inválido ou expirado oferece reenvio e não indica sucesso", async () => {
    server.use(
      http.post(urlConfirmar, () =>
        HttpResponse.json({ detail: "TOKEN_DE_VERIFICACAO_INVALIDO" }, { status: 400 }),
      ),
    );

    abrirLink();

    expect(await screen.findByText("Este link não vale mais")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeEnabled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("reenvio a partir do link inválido pede o e-mail e mostra a resposta genérica", async () => {
    let reenviado: unknown;
    server.use(
      http.post(urlConfirmar, () =>
        HttpResponse.json({ detail: "TOKEN_DE_VERIFICACAO_INVALIDO" }, { status: 400 }),
      ),
      http.post(urlReenviar, async ({ request }) => {
        reenviado = await request.json();
        return HttpResponse.json({ message: "ok" }, { status: 202 });
      }),
    );

    abrirLink();
    await userEvent.click(await screen.findByLabelText("E-mail"));
    await userEvent.paste("pessoa@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    expect(await screen.findByRole("status")).toHaveTextContent("enviaremos um novo link");
    expect(reenviado).toEqual({ email: "pessoa@example.com" });
  });

  it("falha temporária mantém a ação de tentar de novo e confirma depois sem sucesso falso", async () => {
    let chamadas = 0;
    server.use(
      http.post(urlConfirmar, () => {
        chamadas += 1;
        return chamadas === 1
          ? HttpResponse.json({ detail: "erro" }, { status: 500 })
          : new HttpResponse(null, { status: 204 });
      }),
    );

    abrirLink();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(chamadas).toBe(2);
  });

  it("link sem token mostra orientação de reenvio e não chama a API", async () => {
    const chamada = vi.fn();
    server.use(http.post(urlConfirmar, chamada));

    abrirLink("?purpose=email_verification");

    expect(await screen.findByText("Este link não vale mais")).toBeInTheDocument();
    expect(chamada).not.toHaveBeenCalled();
  });
});
