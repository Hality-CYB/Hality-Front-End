import { StrictMode, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { RetornoLoginGoogle } from "@/components/google-login-callback";
import { config } from "@/lib/config";
import { guardarDestinoLoginGoogle } from "@/lib/google-login-destination";
import { clearStoredToken, getStoredToken } from "@/lib/session";
import { server } from "@/services/mocks/server";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const codigo = "codigo-temporario-de-uso-unico";
const exchangeUrl = `${config.apiBaseUrl}/api/v1/auth/google/exchange`;
const termosUrl = `${config.apiBaseUrl}/api/v1/consentimentos/termos`;
const caixaSaude = () => screen.getByRole("checkbox", { name: /dados de saúde/ });
const caixaTreino = () => screen.getByRole("checkbox", { name: /treinar a inteligência/ });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

function abrir(query: string) {
  window.history.replaceState({ preservado: true }, "", `/login/google${query}`);
  return render(
    <StrictMode>
      <Wrapper>
        <RetornoLoginGoogle />
      </Wrapper>
    </StrictMode>,
  );
}

afterEach(() => {
  cleanup();
  clearStoredToken();
  sessionStorage.clear();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("retorno visual do login com Google", () => {
  it("mantém uma mensagem de carregamento enquanto a troca está em andamento", async () => {
    let concluir!: () => void;
    server.use(
      http.post(exchangeUrl, async () => {
        await new Promise<void>((resolve) => {
          concluir = resolve;
        });
        return HttpResponse.json({ access_token: "access-google", token_type: "bearer" });
      }),
    );

    abrir(`?code=${codigo}&etapa=sessao`);

    expect(await screen.findByRole("status")).toHaveTextContent("confirmando seu login");
    expect(mockReplace).not.toHaveBeenCalled();
    await waitFor(() => expect(concluir).toBeTypeOf("function"));
    concluir();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/paciente"));
  });

  it("limpa a URL, troca o código uma vez em StrictMode e entra como paciente", async () => {
    let chamadas = 0;
    let body: unknown;
    server.use(
      http.post(exchangeUrl, async ({ request }) => {
        chamadas += 1;
        body = await request.json();
        return HttpResponse.json({ access_token: "access-google", token_type: "bearer" });
      }),
    );

    abrir(`?code=${codigo}&etapa=sessao&utm_source=teste`);

    await waitFor(() => expect(window.location.search).toBe("?utm_source=teste"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/paciente"));
    expect(window.history.state).toEqual({ preservado: true });
    expect(chamadas).toBe(1);
    expect(body).toEqual({ codigo });
    expect(getStoredToken()).toBe("access-google");
    expect(document.body.textContent).not.toContain(codigo);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("volta para o destino seguro de paciente preservado antes de ir ao Google", async () => {
    guardarDestinoLoginGoogle("/paciente/perfil?aba=privacidade");
    server.use(
      http.post(exchangeUrl, () =>
        HttpResponse.json({ access_token: "access-google", token_type: "bearer" }),
      ),
    );

    abrir(`?code=${codigo}&etapa=sessao`);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/paciente/perfil?aba=privacidade"),
    );
    expect(sessionStorage.getItem("hality:google_return_to")).toBeNull();
  });

  it("mostra os termos desmarcados no primeiro acesso sem trocar o código antes da decisão", async () => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));

    abrir(`?code=${codigo}&etapa=consentimento`);

    expect(await screen.findByRole("heading", { name: "Antes de continuar" })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: /dados de saúde/ })).not.toBeChecked();
    expect(caixaTreino()).not.toBeChecked();
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("exige o consentimento obrigatório antes de criar a conta", async () => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));
    abrir(`?code=${codigo}&etapa=consentimento`);
    await screen.findByRole("checkbox", { name: /dados de saúde/ });

    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("autorize o tratamento");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("envia o aceite obrigatório e a recusa opcional antes de criar a sessão", async () => {
    let body: unknown;
    server.use(
      http.post(exchangeUrl, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ access_token: "access-novo", token_type: "bearer" });
      }),
    );
    abrir(`?code=${codigo}&etapa=consentimento`);
    await userEvent.click(await screen.findByRole("checkbox", { name: /dados de saúde/ }));

    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/paciente"));
    expect(body).toEqual({
      codigo,
      consentimentos: [
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ],
    });
    expect(getStoredToken()).toBe("access-novo");
  });

  it("preserva o destino de paciente também durante os consentimentos do primeiro acesso", async () => {
    guardarDestinoLoginGoogle("/paciente/perfil");
    server.use(
      http.post(exchangeUrl, () =>
        HttpResponse.json({ access_token: "access-novo", token_type: "bearer" }),
      ),
    );
    abrir(`?code=${codigo}&etapa=consentimento`);
    await userEvent.click(await screen.findByRole("checkbox", { name: /dados de saúde/ }));

    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/paciente/perfil"));
    expect(sessionStorage.getItem("hality:google_return_to")).toBeNull();
  });

  it("recarrega termos atualizados e reutiliza o código somente numa nova decisão explícita", async () => {
    let buscas = 0;
    const corpos: unknown[] = [];
    server.use(
      http.get(termosUrl, () => {
        buscas += 1;
        const versao = buscas === 1 ? "v1" : "v2";
        return HttpResponse.json({
          itens: [
            {
              finalidade: "health_data",
              versao,
              obrigatorio: true,
              titulo: "Tratamento de dados de saúde",
              texto: "Termo de saúde",
            },
            {
              finalidade: "image_training",
              versao,
              obrigatorio: false,
              titulo: "Uso da imagem para treinamento",
              texto: "Termo de imagem",
            },
          ],
        });
      }),
      http.post(exchangeUrl, async ({ request }) => {
        corpos.push(await request.json());
        return corpos.length === 1
          ? HttpResponse.json(
              { detail: "versão do termo desatualizada; versão vigente: v2" },
              { status: 409 },
            )
          : HttpResponse.json({ access_token: "access-novo", token_type: "bearer" });
      }),
    );
    abrir(`?code=${codigo}&etapa=consentimento`);
    await userEvent.click(await screen.findByRole("checkbox", { name: /dados de saúde/ }));
    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("termos foram atualizados");
    await waitFor(() => expect(buscas).toBe(2));
    expect(caixaSaude()).not.toBeChecked();

    await userEvent.click(caixaSaude());
    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/paciente"));
    expect(corpos).toHaveLength(2);
    expect(corpos[1]).toEqual({
      codigo,
      consentimentos: [
        { finalidade: "health_data", versao: "v2", aceito: true },
        { finalidade: "image_training", versao: "v2", aceito: false },
      ],
    });
  });

  it("mostra o cancelamento como estado recuperável sem chamar a troca", async () => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));

    abrir("?erro=cancelado");

    expect(await screen.findByRole("heading", { name: "Login cancelado" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Nenhuma alteração foi feita");
    expect(screen.getByRole("link", { name: "Voltar ao login" })).toHaveAttribute("href", "/login");
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it.each([
    ["papel_nao_permitido", "apenas para pacientes"],
    ["conta_existente", "e-mail e senha"],
    ["provedor_indisponivel", "indisponível"],
  ])("explica o erro de callback %s e permite voltar ao login", async (erro, mensagem) => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));

    abrir(`?erro=${erro}`);

    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(screen.getByRole("link", { name: "Voltar ao login" })).toBeInTheDocument();
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("bloqueia retorno ambíguo sem enviar nenhum dos códigos", async () => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));

    abrir(`?code=${codigo}&code=outro-codigo&etapa=sessao`);

    expect(await screen.findByRole("alert")).toHaveTextContent("retorno do Google não é válido");
    expect(exchange).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("não reutiliza o código depois que a página é aberta novamente sem a query", async () => {
    const exchange = vi.fn();
    server.use(http.post(exchangeUrl, exchange));
    const primeiraPagina = abrir(`?code=${codigo}&etapa=consentimento`);
    await screen.findByRole("checkbox", { name: /dados de saúde/ });
    primeiraPagina.unmount();

    abrir("");

    expect(await screen.findByRole("alert")).toHaveTextContent("não possui um código de acesso");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("não expõe o código recusado pelo backend", async () => {
    server.use(
      http.post(exchangeUrl, () => HttpResponse.json({ detail: { codigo } }, { status: 400 })),
    );

    abrir(`?code=${codigo}&etapa=sessao`);

    expect(await screen.findByRole("alert")).toHaveTextContent("expirou ou já foi utilizado");
    expect(document.body.textContent).not.toContain(codigo);
    expect(window.location.search).toBe("");
  });
});
