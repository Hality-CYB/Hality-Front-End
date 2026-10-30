import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import UsuarioDetailPage from "@/app/admin/usuarios/[id]/page";
import { SessaoProvider } from "@/lib/auth/session-context";
import { config } from "@/lib/config";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
const url = `${config.apiBaseUrl}/api/v1/admin/usuarios/convidado-teste`;
const usuario = {
  id: "convidado-teste",
  nome: "Pessoa Convidada",
  email: "convite@example.com",
  telefone: null,
  role: "profissional",
  ativo: false,
  convite_pendente: true,
  profissional: null,
  created_at: "2026-10-20T00:00:00Z",
};
beforeEach(() => setStoredToken("mock-token:admin-1"));
afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
  clearStoredToken();
});

async function renderPagina(pendente = true, extra: Partial<typeof usuario> = {}) {
  server.use(
    http.get(url, () =>
      HttpResponse.json({ ...usuario, convite_pendente: pendente, ativo: !pendente, ...extra }),
    ),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const params = Promise.resolve({ id: usuario.id });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <SessaoProvider
          value={{ id: "admin-1", nome: "Admin", email: "admin@example.com", role: "admin" }}
        >
          <Suspense fallback={null}>
            <UsuarioDetailPage params={params} />
          </Suspense>
        </SessaoProvider>
      </QueryClientProvider>,
    );
  });
  await screen.findByText(usuario.nome);
  return client;
}

describe("reenvio administrativo de convite", () => {
  it("aguarda a API, bloqueia cliques repetidos e atualiza o cache sem apagar a sessão", async () => {
    let concluir: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      concluir = resolve;
    });
    const handler = vi.fn(async () => {
      await pending;
      return HttpResponse.json(usuario);
    });
    server.use(http.post(`${url}/reenviar-convite`, handler));
    const client = await renderPagina();
    client.setQueryData(["currentUser"], { id: "admin-1" });
    fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));
    expect(await screen.findByRole("button", { name: "Reenviando…" })).toBeDisabled();
    expect(screen.queryByText("Um novo convite foi solicitado.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reenviando…" }));
    concluir();
    expect(await screen.findByRole("status")).toHaveTextContent("Um novo convite foi solicitado.");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(["usuarios", "detalhe", usuario.id])).toMatchObject({
      convitePendente: true,
    });
    expect(client.getQueryData(["currentUser"])).toEqual({ id: "admin-1" });
  });

  it.each([403, 404, 409, 500, 503])(
    "mostra erro %s sem inventar envio e permite nova tentativa manual",
    async (status) => {
      const handler = vi.fn(() => HttpResponse.json({ detail: "erro do backend" }, { status }));
      server.use(http.post(`${url}/reenviar-convite`, handler));
      await renderPagina();
      fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));
      await screen.findByRole("alert");
      expect(screen.queryByText("Um novo convite foi solicitado.")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Reenviar convite" })).toBeEnabled(),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    },
  );

  it.each([false, true])(
    "permite retry após falha de rede sem repetir automaticamente a operação (offline=%s)",
    async (offline) => {
      let attempts = 0;
      server.use(
        http.post(`${url}/reenviar-convite`, () =>
          ++attempts === 1 ? HttpResponse.error() : HttpResponse.json(usuario),
        ),
      );
      await renderPagina();
      act(() => onlineManager.setOnline(!offline));
      fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Verifique sua conexão");
      await act(async () => onlineManager.setOnline(true));
      expect(attempts).toBe(1);
      fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));
      await screen.findByText("Um novo convite foi solicitado.");
      expect(attempts).toBe(2);
    },
  );

  it("não oferece reenvio de convite para conta ativa", async () => {
    await renderPagina(false);
    expect(screen.queryByRole("button", { name: "Reenviar convite" })).not.toBeInTheDocument();
  });

  it("distingue convite de bloqueio e permite revogar o acesso pendente sem ativá-lo", async () => {
    await renderPagina();
    expect(screen.queryByText("Bloqueado")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desbloquear usuário" })).not.toBeInTheDocument();
    let bloqueado = false;
    server.use(
      http.get(url, () => HttpResponse.json({ ...usuario, convite_pendente: !bloqueado })),
      http.patch(url, async ({ request }) => {
        expect(await request.json()).toEqual({ ativo: false });
        bloqueado = true;
        return HttpResponse.json({ ...usuario, convite_pendente: false });
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Bloquear usuário" }));
    fireEvent.click(screen.getByRole("button", { name: /^Bloquear$/ }));
    expect(await screen.findByText("Bloqueado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenviar convite" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear usuário" })).toBeInTheDocument();
  });
});

describe("redefinição de senha pelo admin", () => {
  const recuperacao = `${config.apiBaseUrl}/api/v1/auth/password-recovery`;

  it("envia o link de recuperação para o e-mail do usuário após confirmar", async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(recuperacao, async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(
          { message: "Se o e-mail estiver cadastrado, enviaremos as instruções." },
          { status: 202 },
        );
      }),
    );
    await renderPagina(false);
    fireEvent.click(screen.getByRole("button", { name: /Redefinir senha/ }));
    expect(corpos).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText(/O link foi solicitado/)).toBeInTheDocument();
    expect(corpos).toEqual([{ email: usuario.email }]);
    expect(screen.queryByRole("button", { name: "Enviar link" })).not.toBeInTheDocument();
  });

  it("mostra erro e mantém o envio disponível quando a API falha", async () => {
    server.use(http.post(recuperacao, () => HttpResponse.json({}, { status: 500 })));
    await renderPagina(false);
    fireEvent.click(screen.getByRole("button", { name: /Redefinir senha/ }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(
      await screen.findByText("Não foi possível enviar o link. Tente novamente."),
    ).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled());
  });

  it("não oferece redefinição com convite pendente: o caminho é reenviar o convite", async () => {
    await renderPagina(true);
    expect(screen.queryByRole("button", { name: /Redefinir senha/ })).not.toBeInTheDocument();
  });

  it("desabilita a redefinição para usuário bloqueado", async () => {
    await renderPagina(false, { ativo: false });
    expect(screen.getByRole("button", { name: /Redefinir senha/ })).toBeDisabled();
  });
});
