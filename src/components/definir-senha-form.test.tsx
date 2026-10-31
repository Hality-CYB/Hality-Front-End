import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { EntradaPorLink } from "@/components/definir-senha-form";
import { server } from "@/services/mocks/server";
import { config } from "@/lib/config";
import type { FinalidadeDoLink } from "@/types/auth";
import { clearStoredToken } from "@/lib/session";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const TOKEN = "token-sintetico-somente-para-testes";
const SENHA = "NovaSenha123";
const urlConfirmar = (finalidade: FinalidadeDoLink) =>
  `${config.apiBaseUrl}/api/v1/auth/${finalidade === "convite" ? "invitation" : "password-recovery"}/confirm`;
const urlTermos = `${config.apiBaseUrl}/api/v1/consentimentos/termos`;
const pedirConsentimento = () =>
  HttpResponse.json({ detail: "CONSENTIMENTO_OBRIGATORIO" }, { status: 422 });

/** Abre a tela como o link do e-mail: na raiz, com `purpose` e `token`. */
function abrirLink(finalidade: FinalidadeDoLink, query?: string) {
  const purpose = finalidade === "convite" ? "invitation" : "password_reset";
  window.history.replaceState(
    { preservado: true },
    "",
    `/${query ?? `?purpose=${purpose}&token=${TOKEN}`}`,
  );
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

/** Abre a rota própria (/primeiro-acesso ou /redefinir-senha). */
function abrirRota(finalidade: FinalidadeDoLink, query = `?token=${TOKEN}`) {
  window.history.replaceState(null, "", `/rota${query}`);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EntradaPorLink finalidade={finalidade} />
    </QueryClientProvider>,
  );
}

async function preencherSenha(finalidade: FinalidadeDoLink, senha = SENHA, confirmacao = senha) {
  const rotulo = finalidade === "convite" ? "Senha" : "Nova senha";
  fireEvent.change(await screen.findByLabelText(rotulo), { target: { value: senha } });
  fireEvent.change(
    screen.getByLabelText(finalidade === "convite" ? "Confirmar senha" : "Confirmar nova senha"),
    { target: { value: confirmacao } },
  );
}

const aceitarTermosDeUso = () =>
  fireEvent.click(screen.getByRole("checkbox", { name: /Termos de Uso/ }));
const ativar = () => fireEvent.click(screen.getByRole("button", { name: "Ativar conta" }));

afterEach(() => {
  cleanup();
  clearStoredToken();
  window.history.replaceState(null, "", "/");
});

describe("link do e-mail", () => {
  it("tira o token da URL, preserva o history.state e funciona em StrictMode", async () => {
    abrirLink("recuperacao");
    expect(await screen.findByRole("heading", { name: "Nova senha" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(window.history.state).toEqual({ preservado: true });
  });

  it("na raiz sem link, mostra a landing", () => {
    abrirLink("convite", "");
    expect(screen.getByText("Landing")).toBeInTheDocument();
  });

  it.each(["convite", "recuperacao"] as const)(
    "sem token na rota de %s, orienta a abrir o link do e-mail, sem formulário",
    async (finalidade) => {
      abrirRota(finalidade, "");
      expect(
        await screen.findByRole("heading", {
          name: finalidade === "convite" ? "Use o link do convite" : "Use o link do e-mail",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ativar conta|Salvar nova senha/ })).toBeNull();
    },
  );

  it.each([
    "?purpose=invitation&token=curto",
    "?purpose=invitation&purpose=outro&token=token-sintetico-somente-para-testes",
  ])("link malformado na raiz mostra que não vale e bloqueia o envio: %s", async (query) => {
    abrirLink("convite", query);
    expect(await screen.findByText(/Este link não vale mais/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar conta" })).toBeDisabled();
  });

  it("ao sair da página, esquece senha e token e não mostra mais o formulário", async () => {
    abrirLink("recuperacao");
    await preencherSenha("recuperacao");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(
      await screen.findByRole("heading", { name: "Use o link do e-mail" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });
});

describe("recuperação de senha", () => {
  it("aplica a regra de senha e a confirmação antes de enviar", async () => {
    const enviado = vi.fn();
    server.use(http.post(urlConfirmar("recuperacao"), enviado));
    abrirLink("recuperacao");
    expect(await screen.findByText("8 caracteres ou mais")).toBeInTheDocument();

    await preencherSenha("recuperacao", "semmaiuscula1");
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("letra maiúscula");

    await preencherSenha("recuperacao", SENHA, "Outra12345");
    expect(screen.getAllByText("As senhas não coincidem.").length).toBeGreaterThan(0);
    expect(enviado).not.toHaveBeenCalled();
  });

  it("mostra sucesso só depois do 204 e manda token e senha", async () => {
    let corpo: unknown;
    server.use(
      http.post(urlConfirmar("recuperacao"), async ({ request }) => {
        corpo = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    abrirLink("recuperacao");
    await preencherSenha("recuperacao");
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText(/Senha alterada!/)).toBeInTheDocument();
    expect(corpo).toEqual({ token: TOKEN, senha: SENHA });
  });

  it("link recusado pelo back (400) bloqueia os campos e oferece pedir outro", async () => {
    server.use(
      http.post(urlConfirmar("recuperacao"), () =>
        HttpResponse.json({ detail: "TOKEN_DE_RECUPERACAO_INVALIDO" }, { status: 400 }),
      ),
    );
    abrirLink("recuperacao");
    await preencherSenha("recuperacao");
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link não vale mais");
    expect(screen.getByLabelText("Nova senha")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Pedir um novo link" })).toBeInTheDocument();
  });

  it("falha de rede deixa tentar de novo com a mesma senha", async () => {
    let tentativas = 0;
    server.use(
      http.post(urlConfirmar("recuperacao"), () =>
        ++tentativas === 1 ? HttpResponse.error() : new HttpResponse(null, { status: 204 }),
      ),
    );
    abrirLink("recuperacao");
    await preencherSenha("recuperacao");
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveValue(SENHA);

    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText(/Senha alterada!/)).toBeInTheDocument();
  });
});

describe("convite", () => {
  it("exige aceitar os Termos de Uso antes de ativar", async () => {
    const enviado = vi.fn();
    server.use(http.post(urlConfirmar("convite"), enviado));
    abrirLink("convite");
    await preencherSenha("convite");
    ativar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Termos de Uso");
    expect(enviado).not.toHaveBeenCalled();
  });

  it("convite sem exigência de consentimento ativa direto, sem buscar termos", async () => {
    const termos = vi.fn();
    let corpo: unknown;
    server.use(
      http.get(urlTermos, () => {
        termos();
        return HttpResponse.json({ itens: [] });
      }),
      http.post(urlConfirmar("convite"), async ({ request }) => {
        corpo = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    abrirLink("convite");
    await preencherSenha("convite");
    aceitarTermosDeUso();
    ativar();
    expect(await screen.findByText(/Conta ativada!/)).toBeInTheDocument();
    expect(corpo).toEqual({ token: TOKEN, senha: SENHA });
    expect(termos).not.toHaveBeenCalled();
  });

  it("quando o back pede consentimento, mostra os termos sem apagar a senha e envia as decisões", async () => {
    const corpos: unknown[] = [];
    server.use(
      http.post(urlConfirmar("convite"), async ({ request }) => {
        const corpo = (await request.json()) as { consentimentos?: unknown };
        corpos.push(corpo);
        return corpo.consentimentos
          ? new HttpResponse(null, { status: 204 })
          : pedirConsentimento();
      }),
    );
    abrirLink("convite");
    await preencherSenha("convite");
    aceitarTermosDeUso();
    ativar();

    const caixaSaude = await screen.findByRole("checkbox", { name: /dados de saúde/ });
    // A senha continua preenchida: a pessoa só decide os termos e ativa.
    expect(screen.getByLabelText("Senha")).toHaveValue(SENHA);
    expect(screen.getByLabelText("Confirmar senha")).toHaveValue(SENHA);

    fireEvent.click(caixaSaude);
    ativar();
    expect(await screen.findByText(/Conta ativada!/)).toBeInTheDocument();
    expect(corpos.at(-1)).toEqual({
      token: TOKEN,
      senha: SENHA,
      consentimentos: [
        { finalidade: "health_data", versao: "v1", aceito: true },
        { finalidade: "image_training", versao: "v1", aceito: false },
      ],
    });
  });

  it("sem autorizar os dados de saúde, não envia", async () => {
    let envios = 0;
    server.use(
      http.post(urlConfirmar("convite"), () => {
        envios += 1;
        return pedirConsentimento();
      }),
    );
    abrirLink("convite");
    await preencherSenha("convite");
    aceitarTermosDeUso();
    ativar();
    await screen.findByRole("checkbox", { name: /dados de saúde/ });

    ativar();
    expect(await screen.findByRole("alert")).toHaveTextContent("autorize o tratamento");
    expect(envios).toBe(1);
  });

  it("409 (termo atualizado) busca os termos de novo e pede nova decisão", async () => {
    let buscas = 0;
    server.use(
      http.get(urlTermos, () => {
        buscas += 1;
        return HttpResponse.json({
          itens: [
            {
              finalidade: "health_data",
              versao: "v2",
              obrigatorio: true,
              titulo: "Tratamento de dados de saúde",
              texto: "t",
            },
          ],
        });
      }),
      http.post(urlConfirmar("convite"), async ({ request }) => {
        const corpo = (await request.json()) as { consentimentos?: unknown };
        return corpo.consentimentos
          ? HttpResponse.json({ detail: "versão do termo desatualizada" }, { status: 409 })
          : pedirConsentimento();
      }),
    );
    abrirLink("convite");
    await preencherSenha("convite");
    aceitarTermosDeUso();
    ativar();
    fireEvent.click(await screen.findByRole("checkbox", { name: /dados de saúde/ }));
    ativar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Os termos foram atualizados");
    await waitFor(() => expect(buscas).toBe(2));
    expect(screen.getByRole("checkbox", { name: /dados de saúde/ })).not.toBeChecked();
  });

  it("o nome do termo abre o texto sem marcar a caixa", async () => {
    server.use(http.post(urlConfirmar("convite"), pedirConsentimento));
    abrirLink("convite");
    await preencherSenha("convite");
    aceitarTermosDeUso();
    ativar();
    await screen.findByRole("checkbox", { name: /dados de saúde/ });

    fireEvent.click(screen.getByRole("button", { name: "termo de tratamento de dados de saúde" }));
    expect(
      await screen.findByRole("dialog", { name: "Tratamento de dados de saúde" }),
    ).toBeInTheDocument();
  });
});
