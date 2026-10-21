import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { IdentityLinkEntry } from "@/components/identity-password-form";
import { server } from "@/services/mocks/server";
import { config } from "@/lib/config";
import type { IdentityPurpose } from "@/types/auth";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";
import { TERMOS_MOCK } from "@/services/mocks/consentimentos-handlers";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
const token = "token-sintetico-somente-para-testes";
const url = (purpose: IdentityPurpose) =>
  `${config.apiBaseUrl}/api/v1/auth/${purpose === "invitation" ? "invitation" : "password-recovery"}/confirm`;

function renderForm(purpose: IdentityPurpose, query = `?token=${token}`) {
  window.history.replaceState(
    { preserved: true },
    "",
    `/${purpose === "invitation" ? "primeiro-acesso" : "redefinir-senha"}${query}`,
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <IdentityLinkEntry purpose={purpose} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { ...result, client };
}
async function fillPassword(password = "NovaSenha123", confirmation = password) {
  fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
    target: { value: confirmation },
  });
}
afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
  clearStoredToken();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("consentimentos no primeiro acesso", () => {
  const termsUrl = `${config.apiBaseUrl}/api/v1/consentimentos/termos`;
  const exigirConsentimento = () =>
    HttpResponse.json(
      {
        detail: "o consentimento para tratamento de dados de saúde é obrigatório",
      },
      { status: 422 },
    );

  function escolher(titulo: string, aceito: boolean) {
    fireEvent.click(
      within(screen.getByRole("group", { name: titulo })).getByRole("radio", {
        name: aceito ? "Aceito" : "Não aceito",
      }),
    );
  }

  async function iniciar() {
    const result = renderForm("invitation");
    await waitFor(() => expect(window.location.search).toBe(""));
    await fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
    return result;
  }

  it("coleta decisões apenas quando a API exige, permite recusar treino e não expõe segredos", async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(url("invitation"), async ({ request }) => {
        const body = (await request.json()) as { consentimentos?: unknown[] };
        requests.push(body);
        return body.consentimentos
          ? new HttpResponse(null, { status: 204 })
          : exigirConsentimento();
      }),
      http.get(termsUrl, ({ request }) => {
        expect(request.headers.get("authorization")).toBeNull();
        return HttpResponse.json({ itens: TERMOS_MOCK });
      }),
    );
    setStoredToken("outra-sessao");
    const { client } = await iniciar();
    client.setQueryData(["currentUser"], { id: "outro-usuario" });
    await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
    expect(
      screen.getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeDisabled();
    expect(requests).toHaveLength(1);
    await fillPassword();
    escolher("Tratamento de dados de saúde", true);
    escolher("Uso da imagem para treinamento", false);
    fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
    await screen.findByRole("link", { name: "Ir para o login" });
    expect(requests[1]).toEqual({
      token,
      senha: "NovaSenha123",
      consentimentos: [
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ],
    });
    expect(getStoredToken()).toBe("outra-sessao");
    expect(client.getQueryData(["currentUser"])).toEqual({ id: "outro-usuario" });
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state),
      ),
    ).not.toContain(token);
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state),
      ),
    ).not.toContain("NovaSenha123");
    expect(document.body.textContent).not.toContain(token);
  });

  it("recusar saúde bloqueia a confirmação inclusive por submit direto", async () => {
    const post = vi.fn(exigirConsentimento);
    server.use(http.post(url("invitation"), post));
    const { container } = await iniciar();
    await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
    await fillPassword();
    escolher("Tratamento de dados de saúde", false);
    escolher("Uso da imagem para treinamento", false);
    expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeDisabled();
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "aceite os consentimentos obrigatórios",
    );
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("permite não decidir sobre treino e não inventa uma recusa ou aceite no payload", async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(url("invitation"), async ({ request }) => {
        const body = (await request.json()) as { consentimentos?: unknown[] };
        requests.push(body);
        return body.consentimentos
          ? new HttpResponse(null, { status: 204 })
          : exigirConsentimento();
      }),
    );
    await iniciar();
    await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
    await fillPassword();
    escolher("Tratamento de dados de saúde", true);
    expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
    await screen.findByRole("link", { name: "Ir para o login" });
    expect(requests[1]).toEqual({
      token,
      senha: "NovaSenha123",
      consentimentos: [{ finalidade: "health_data", versao: "v1", aceito: true }],
    });
  });

  it.each([503, 200])(
    "bloqueia ativação com catálogo indisponível/incompleto (%s) e oferece retry",
    async (status) => {
      let recovered = false;
      const post = vi.fn(exigirConsentimento);
      server.use(
        http.post(url("invitation"), post),
        http.get(termsUrl, () =>
          recovered
            ? HttpResponse.json({ itens: TERMOS_MOCK })
            : HttpResponse.json({ itens: [] }, { status }),
        ),
      );
      await iniciar();
      expect(await screen.findByRole("alert")).toHaveTextContent("carregar os termos necessários");
      expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeDisabled();
      recovered = true;
      fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
      await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
      expect(post).toHaveBeenCalledTimes(1);
    },
  );

  it("409 recarrega o catálogo e exige novas decisões antes de reenviar o mesmo token", async () => {
    let version = "v1";
    const requests: { consentimentos?: { versao: string }[] }[] = [];
    server.use(
      http.get(termsUrl, () =>
        HttpResponse.json({ itens: TERMOS_MOCK.map((termo) => ({ ...termo, versao: version })) }),
      ),
      http.post(url("invitation"), async ({ request }) => {
        const body = (await request.json()) as { consentimentos?: { versao: string }[] };
        requests.push(body);
        if (!body.consentimentos) return exigirConsentimento();
        if (body.consentimentos[0]?.versao === "v1") {
          version = "v2";
          return HttpResponse.json(
            { detail: "versão do termo desatualizada; versão vigente: v2" },
            { status: 409 },
          );
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await iniciar();
    await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
    await fillPassword();
    escolher("Tratamento de dados de saúde", true);
    escolher("Uso da imagem para treinamento", false);
    fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
    await waitFor(() => expect(screen.getAllByText("Ler o termo (versão v2)")).toHaveLength(2));
    expect(
      screen.getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeDisabled();
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    await fillPassword();
    escolher("Tratamento de dados de saúde", true);
    escolher("Uso da imagem para treinamento", false);
    fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
    await screen.findByRole("link", { name: "Ir para o login" });
    expect(requests).toHaveLength(3);
    expect(requests[2]?.consentimentos?.every((decisao) => decisao.versao === "v2")).toBe(true);
  });

  it("convite sem exigência de consentimento conclui sem buscar termos ou inferir o papel", async () => {
    const getTerms = vi.fn(() => HttpResponse.json({ itens: [] }, { status: 503 }));
    server.use(
      http.get(termsUrl, getTerms),
      http.post(url("invitation"), () => new HttpResponse(null, { status: 204 })),
    );
    await iniciar();
    await screen.findByRole("link", { name: "Ir para o login" });
    expect(getTerms).not.toHaveBeenCalled();
  });
});

describe("telas públicas de definição de senha", () => {
  it("limpa a URL, preserva o history.state e funciona em StrictMode sem selo de link verificado", async () => {
    renderForm("password_reset");
    await screen.findByRole("heading", { name: "Crie uma nova senha" });
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(window.history.state).toEqual({ preserved: true });
    expect(document.body.textContent).not.toContain(token);
    expect(window.localStorage.getItem("token")).toBeNull();
    expect(screen.queryByText("LINK VERIFICADO")).not.toBeInTheDocument();
    expect(screen.queryByText("CHECK YOUR BREATH")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Hality/ })).toBeInTheDocument();
    await fillPassword();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar nova senha" })).toBeEnabled(),
    );
  });

  it.each([
    {
      purpose: "invitation" as const,
      title: "Acesse seu convite",
      description: "Para ativar sua conta, utilize o link de convite enviado ao seu e-mail.",
      action: "Voltar ao login",
      href: "/login",
    },
    {
      purpose: "password_reset" as const,
      title: "Link de recuperação necessário",
      description: "Para criar uma nova senha, acesse o link enviado ao seu e-mail.",
      action: "Solicitar novo link",
      href: "/esqueci-senha",
    },
  ])(
    "mostra orientação sem formulário nem erro quando falta token de $purpose",
    async ({ purpose, title, description, action, href }) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { container } = renderForm(purpose, "");
      expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: action })).toHaveAttribute("href", href);
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector("input")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /Salvar nova senha|Ativar minha conta/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText("CHECK YOUR BREATH")).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: /Hality/ })).toBeInTheDocument();
      if (purpose === "invitation") {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Caso não tenha recebido um convite, entre em contato com o responsável pelo cadastro.",
        );
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("associa labels, alterna visibilidade e valida senha/confirmacão", async () => {
    renderForm("invitation");
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.queryByText("CHECK YOUR BREATH")).not.toBeInTheDocument();
    await fillPassword("abcdefgh1");
    expect(screen.getByRole("button", { name: "Ativar minha conta" })).toBeDisabled();
    await fillPassword("NovaSenha123", "OutraSenha123");
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar nova senha" }));
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar nova senha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it.each(["password_reset", "invitation"] as const)(
    "exibe sucesso de %s só após confirmação HTTP e não guarda segredos na mutation",
    async (purpose) => {
      let resolveRequest: () => void = () => {};
      const pending = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      const outbox = { token, consumed: false }; // Fixture local; não envia e-mail.
      server.use(
        http.post(url(purpose), async ({ request }) => {
          const body = (await request.json()) as { token: string; senha: string };
          expect(body.token).toBe(outbox.token);
          await pending;
          outbox.consumed = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { client } = renderForm(purpose);
      setStoredToken("sessao-anterior");
      client.setQueryData(["currentUser"], { id: "usuario-anterior" });
      client.setQueryData(["recurso-existente"], { preservado: true });
      await waitFor(() => expect(window.location.search).toBe(""));
      await fillPassword();
      fireEvent.click(
        screen.getByRole("button", {
          name: purpose === "invitation" ? "Ativar minha conta" : "Salvar nova senha",
        }),
      );
      expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
      expect(screen.queryByRole("link", { name: "Ir para o login" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Nova senha")).toHaveValue("");
      expect(
        client
          .getMutationCache()
          .getAll()
          .every((mutation) => mutation.state.variables === undefined),
      ).toBe(true);
      resolveRequest();
      expect(await screen.findByRole("link", { name: "Ir para o login" })).toHaveAttribute(
        "href",
        "/login",
      );
      expect(outbox.consumed).toBe(true);
      expect(getStoredToken()).toBe("sessao-anterior");
      expect(client.getQueryData(["currentUser"])).toEqual({ id: "usuario-anterior" });
      expect(client.getQueryData(["recurso-existente"])).toEqual({ preservado: true });
      expect(document.body.textContent).not.toContain(token);
      expect(
        JSON.stringify(
          client
            .getMutationCache()
            .getAll()
            .map((mutation) => mutation.state),
        ),
      ).not.toContain("NovaSenha123");
    },
  );

  it.each(["password_reset", "invitation"] as const)(
    "bloqueia campos e envio após rejeição definitiva de %s",
    async (purpose) => {
      const handler = vi.fn(() =>
        HttpResponse.json({ detail: "TOKEN_DE_RECUPERACAO_INVALIDO" }, { status: 400 }),
      );
      server.use(http.post(url(purpose), handler));
      const { container } = renderForm(purpose);
      await waitFor(() => expect(window.location.search).toBe(""));
      await fillPassword();
      fireEvent.click(
        screen.getByRole("button", {
          name: purpose === "invitation" ? "Ativar minha conta" : "Salvar nova senha",
        }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent("pode ter expirado");
      expect(screen.getByLabelText("Nova senha")).toBeDisabled();
      expect(screen.getByLabelText("Confirmar nova senha")).toBeDisabled();
      expect(screen.getByLabelText("Nova senha")).toHaveValue("");
      expect(screen.getByRole("button", { name: "Mostrar nova senha" })).toBeDisabled();
      expect(
        screen.getByRole("button", {
          name: purpose === "invitation" ? "Ativar minha conta" : "Salvar nova senha",
        }),
      ).toBeDisabled();
      expect(
        screen.getByRole("link", {
          name: purpose === "invitation" ? "Voltar ao login" : "Solicitar novo link",
        }),
      ).toHaveAttribute("href", purpose === "invitation" ? "/login" : "/esqueci-senha");
      fireEvent.submit(container.querySelector("form")!);
      expect(handler).toHaveBeenCalledTimes(1);
    },
  );

  it.each([false, true])(
    "permite retry manual após falha de rede sem reusar a senha (offline=%s)",
    async (offline) => {
      let attempts = 0;
      server.use(
        http.post(url("invitation"), () =>
          ++attempts === 1 ? HttpResponse.error() : new HttpResponse(null, { status: 204 }),
        ),
      );
      renderForm("invitation");
      await waitFor(() => expect(window.location.search).toBe(""));
      act(() => onlineManager.setOnline(!offline));
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("conectar ao servidor");
      expect(attempts).toBe(1);
      expect(screen.getByLabelText("Nova senha")).toHaveValue("");
      expect(screen.getByLabelText("Nova senha")).toBeEnabled();
      expect(screen.getByLabelText("Confirmar nova senha")).toBeEnabled();
      await act(async () => onlineManager.setOnline(true));
      expect(attempts).toBe(1);
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
      await screen.findByRole("link", { name: "Ir para o login" });
      expect(attempts).toBe(2);
    },
  );

  it.each(["password_reset", "invitation"] as const)(
    "preserva token e sessão após indisponibilidade HTTP de %s e exige retry manual",
    async (purpose) => {
      let attempts = 0;
      server.use(
        http.post(url(purpose), async ({ request }) => {
          expect(await request.json()).toEqual({ token, senha: "NovaSenha123" });
          return ++attempts === 1
            ? HttpResponse.json({ detail: "database unavailable" }, { status: 503 })
            : new HttpResponse(null, { status: 204 });
        }),
      );
      const { client } = renderForm(purpose);
      setStoredToken("sessao-existente");
      client.setQueryData(["currentUser"], { id: "outra-conta" });
      await waitFor(() => expect(window.location.search).toBe(""));
      const button = purpose === "invitation" ? "Ativar minha conta" : "Salvar nova senha";
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: button }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente");
      expect(screen.queryByRole("link", { name: "Ir para o login" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Nova senha")).toBeEnabled();
      expect(screen.getByLabelText("Nova senha")).toHaveValue("");
      expect(screen.getByLabelText("Confirmar nova senha")).toHaveValue("");
      expect(attempts).toBe(1);
      expect(getStoredToken()).toBe("sessao-existente");
      expect(client.getQueryData(["currentUser"])).toEqual({ id: "outra-conta" });
      expect(document.body.textContent).not.toContain("database unavailable");
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: button }));
      await screen.findByRole("link", { name: "Ir para o login" });
      expect(attempts).toBe(2);
      expect(getStoredToken()).toBe("sessao-existente");
      expect(client.getQueryData(["currentUser"])).toEqual({ id: "outra-conta" });
    },
  );

  it.each([409, 422])(
    "preserva o token de convite após erro %s de consentimento, sem sucesso fictício",
    async (status) => {
      let attempts = 0;
      const handler = vi.fn(async ({ request }: { request: Request }) => {
        const body = await request.json();
        expect(body).toEqual({
          token,
          senha: "NovaSenha123",
          ...(status === 409 && attempts > 0
            ? {
                consentimentos: [
                  { finalidade: "health_data", versao: "v1", aceito: true },
                  { finalidade: "image_training", versao: "v1", aceito: false },
                ],
              }
            : {}),
        });
        attempts++;
        return HttpResponse.json(
          { detail: "consentimento exigido ou versão atualizada" },
          { status },
        );
      });
      server.use(http.post(url("invitation"), handler));
      renderForm("invitation");
      await waitFor(() => expect(window.location.search).toBe(""));
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("consentimento");
      expect(screen.queryByRole("link", { name: "Ir para o login" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Nova senha")).toBeEnabled();
      expect(screen.getByLabelText("Nova senha")).toHaveValue("");
      if (status === 409) {
        await screen.findByRole("group", { name: "Tratamento de dados de saúde" });
        fireEvent.click(
          within(screen.getByRole("group", { name: "Tratamento de dados de saúde" })).getByRole(
            "radio",
            { name: "Aceito" },
          ),
        );
        fireEvent.click(
          within(screen.getByRole("group", { name: "Uso da imagem para treinamento" })).getByRole(
            "radio",
            { name: "Não aceito" },
          ),
        );
      }
      await fillPassword();
      fireEvent.click(screen.getByRole("button", { name: "Ativar minha conta" }));
      await waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
    },
  );

  it.each(["invitation", "password_reset"] as const)(
    "abre %s da outbox na raiz sem redirecionar o token",
    async (purpose) => {
      window.history.replaceState(
        null,
        "",
        `/?purpose=${purpose}&token=${token}&utm_source=email#conteudo`,
      );
      const client = new QueryClient();
      render(
        <QueryClientProvider client={client}>
          <IdentityLinkEntry>
            <p>Landing existente</p>
          </IdentityLinkEntry>
        </QueryClientProvider>,
      );
      expect(
        await screen.findByRole("heading", {
          name: purpose === "invitation" ? "Boas-vindas ao CYB" : "Crie uma nova senha",
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe("/");
      expect(window.location.search).toBe("?utm_source=email");
      expect(window.location.hash).toBe("#conteudo");
      expect(screen.queryByText("Landing existente")).not.toBeInTheDocument();
    },
  );

  it.each([
    "",
    "?utm_source=campanha",
    "?purpose=outro",
    "?token=outra-funcionalidade",
    "?purpose=outro&token=outra-funcionalidade",
    "?purpose=&token=outra-funcionalidade",
  ])("preserva a landing e os parâmetros não relacionados: %s", async (query) => {
    window.history.replaceState({ preservado: true }, "", `/${query}#conteudo`);
    const client = new QueryClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <IdentityLinkEntry>
            <h1>Landing existente</h1>
          </IdentityLinkEntry>
        </QueryClientProvider>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Landing existente" })).toBeInTheDocument(),
    );
    expect(window.location.search).toBe(query);
    expect(window.location.hash).toBe("#conteudo");
    expect(window.history.state).toEqual({ preservado: true });
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    "?purpose=invitation&token=curto",
    `?purpose=password_reset&token=${token}&token=outro`,
    `?purpose=invitation&purpose=outro&token=${token}`,
  ])("recusa link de identidade malformado na raiz: %s", async (query) => {
    window.history.replaceState(null, "", `/${query}`);
    const client = new QueryClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <QueryClientProvider client={client}>
        <IdentityLinkEntry>
          <p>Landing existente</p>
        </IdentityLinkEntry>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("link é inválido");
    expect(window.location.search).toBe("");
    expect(screen.queryByText("Landing existente")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("limpa senha, visibilidade e token ao sair, inclusive com cache de navegação", async () => {
    renderForm("password_reset");
    await waitFor(() => expect(window.location.search).toBe(""));
    await fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar nova senha" }));
    fireEvent(window, new Event("pagehide"));
    expect(
      screen.getByRole("heading", { name: "Link de recuperação necessário" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirmar nova senha")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar nova senha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
