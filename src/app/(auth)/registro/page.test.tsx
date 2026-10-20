import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import RegistroPage from "@/app/(auth)/registro/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// O AuthCard carrega o logo com next/image, que não resolve imagem estática no teste.
vi.mock("@/components/auth-card", () => ({
  AuthCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const url = (path: string) => `${config.apiBaseUrl}${path}`;

async function preencherConta() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RegistroPage />
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByPlaceholderText("Seu nome completo"), "Pessoa Nova");
  await userEvent.type(screen.getByPlaceholderText("seu@email.com"), "nova@hality.com");
  const [senha, confirmar] = screen.getAllByPlaceholderText(/•/);
  await userEvent.type(senha!, "SenhaSegura1");
  await userEvent.type(confirmar!, "SenhaSegura1");
  await userEvent.click(screen.getByRole("checkbox"));
  // Os termos vêm do back (mock), com nada marcado.
  await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
}

function escolher(grupo: string, opcao: "Aceito" | "Não aceito") {
  const fieldset = screen.getByRole("group", { name: grupo });
  return userEvent.click(
    [...fieldset.querySelectorAll("label")].find((l) => l.textContent?.trim() === opcao)!,
  );
}

describe("Cadastro com consentimentos (TASK-208)", () => {
  it("não envia sem uma decisão em cada consentimento", async () => {
    const enviado = vi.fn();
    server.use(http.post(url("/api/v1/auth/register"), enviado));
    await preencherConta();

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Responda a cada consentimento");
    expect(enviado).not.toHaveBeenCalled();
  });

  it("recusar dados de saúde explica e bloqueia o cadastro", async () => {
    const enviado = vi.fn();
    server.use(http.post(url("/api/v1/auth/register"), enviado));
    await preencherConta();

    await escolher("Tratamento de dados de saúde", "Não aceito");
    await escolher("Uso da imagem para treinamento", "Não aceito");
    expect(screen.getByText(/Sem este consentimento não é possível usar o app/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("aceite o tratamento");
    expect(enviado).not.toHaveBeenCalled();
  });

  it("aceitar saúde e recusar treino envia as duas decisões com a versão", async () => {
    let corpo: { consentimentos?: unknown } | undefined;
    server.use(
      http.post(url("/api/v1/auth/register"), async ({ request }) => {
        corpo = (await request.json()) as { consentimentos?: unknown };
        return HttpResponse.json({ detail: "parar aqui" }, { status: 500 });
      }),
    );
    await preencherConta();

    await escolher("Tratamento de dados de saúde", "Aceito");
    await escolher("Uso da imagem para treinamento", "Não aceito");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await vi.waitFor(() => expect(corpo).toBeDefined());
    expect(corpo?.consentimentos).toEqual([
      { finalidade: "health_data", versao: "v1", aceito: true },
      { finalidade: "image_training", versao: "v1", aceito: false },
    ]);
  });
});
