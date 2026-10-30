import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { getStoredToken } from "@/lib/session";
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

/** Cola o texto de uma vez: digitar letra a letra estoura o timeout com a suíte cheia. */
async function preencher(campo: HTMLElement, texto: string) {
  await userEvent.click(campo);
  await userEvent.paste(texto);
}

const caixaSaude = () => screen.getByRole("checkbox", { name: /dados de saúde/ });
const caixaTreino = () => screen.getByRole("checkbox", { name: /treinar a inteligência/ });

async function preencherConta({ aceitarTermosDeUso = true } = {}) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RegistroPage />
    </QueryClientProvider>,
  );
  await preencher(screen.getByPlaceholderText("Seu nome completo"), "Pessoa Nova");
  await preencher(screen.getByPlaceholderText("seu@email.com"), "nova@hality.com");
  const [senha, confirmar] = screen.getAllByPlaceholderText(/•/);
  await preencher(senha!, "SenhaSegura1");
  await preencher(confirmar!, "SenhaSegura1");
  fireEvent.change(screen.getByLabelText("Data de nascimento *"), {
    target: { value: "1990-05-20" },
  });
  // Os termos vêm do back (mock), com nada marcado.
  await screen.findByRole("checkbox", { name: /dados de saúde/ });
  if (aceitarTermosDeUso) {
    await userEvent.click(screen.getByRole("checkbox", { name: /Termos de Uso/ }));
  }
}

describe("Cadastro com consentimentos (TASK-208)", () => {
  it("nenhuma caixa vem marcada", async () => {
    await preencherConta({ aceitarTermosDeUso: false });
    for (const caixa of screen.getAllByRole("checkbox")) expect(caixa).not.toBeChecked();
  });

  it("sem autorizar os dados de saúde, explica e não envia", async () => {
    const enviado = vi.fn();
    server.use(http.post(url("/api/v1/auth/register"), enviado));
    await preencherConta();

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("aceite o tratamento");
    expect(enviado).not.toHaveBeenCalled();
  });

  it("saúde marcada e treino desmarcado: envia as duas decisões com a versão", async () => {
    let corpo: { consentimentos?: unknown } | undefined;
    server.use(
      http.post(url("/api/v1/auth/register"), async ({ request }) => {
        corpo = (await request.json()) as { consentimentos?: unknown };
        return HttpResponse.json({ detail: "parar aqui" }, { status: 500 });
      }),
    );
    await preencherConta();

    await userEvent.click(caixaSaude());
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await vi.waitFor(() => expect(corpo).toBeDefined());
    expect(corpo?.consentimentos).toEqual([
      { finalidade: "health_data", versao: "v1", aceito: true },
      { finalidade: "image_training", versao: "v1", aceito: false },
    ]);
  });

  it("clicar no nome do termo abre o texto e não marca a caixa", async () => {
    await preencherConta({ aceitarTermosDeUso: false });

    await userEvent.click(
      screen.getByRole("button", { name: "termo de uso da imagem para treinamento" }),
    );
    const termo = await screen.findByRole("dialog", { name: "Uso da imagem para treinamento" });
    expect(within(termo).getByText(/Esta autorização é opcional/)).toBeInTheDocument();

    // Com o pop-up aberto o resto da página fica oculto; confere depois de fechar.
    await userEvent.keyboard("{Escape}");
    expect(caixaTreino()).not.toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Política de Privacidade" }));
    const politica = await screen.findByRole("dialog", { name: "Política de Privacidade" });
    expect(within(politica).getByText("8. Seus direitos")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("checkbox", { name: /Termos de Uso/ })).not.toBeChecked();
  });

  it("sem data de nascimento, pede o dado e não envia", async () => {
    const enviado = vi.fn();
    server.use(http.post(url("/api/v1/auth/register"), enviado));
    await preencherConta();
    fireEvent.change(screen.getByLabelText("Data de nascimento *"), { target: { value: "" } });
    await userEvent.click(caixaSaude());
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe a data de nascimento.");
    expect(enviado).not.toHaveBeenCalled();
  });

  it("cadastro criado mostra a instrução de confirmação, oferece reenvio e não inicia sessão", async () => {
    server.use(
      http.post(url("/api/v1/auth/register"), () =>
        HttpResponse.json(
          {
            id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
            email: "nova@hality.com",
            name: "Pessoa Nova",
            phone: null,
            role: "patient",
            is_active: true,
          },
          { status: 201 },
        ),
      ),
    );
    await preencherConta();
    await userEvent.click(caixaSaude());
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText(/nova@hality.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Criar conta" })).not.toBeInTheDocument();
    expect(getStoredToken()).toBeNull();
  });
});
