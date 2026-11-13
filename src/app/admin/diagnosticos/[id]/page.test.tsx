import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { server } from "@/services/mocks/server";
import DiagnosticoDetailAdminPage from "@/app/admin/diagnosticos/[id]/page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const url = `${config.apiBaseUrl}/api/v1/admin/diagnosticos/101`;

const INTIMA = { codigo: "halitose_intima", nome_exibicao: "Halitose Íntima", ordem: 2 };
const SOCIAL = { codigo: "mau_halito_social", nome_exibicao: "Mau Hálito Social", ordem: 3 };

const SEM_REVISAO = {
  status: "pendente",
  profissional_revisor_id: null,
  profissional_revisor_nome: null,
  data_revisao: null,
  classificacao: null,
  observacoes: null,
};

const SEM_ROTULO = {
  atual: null,
  historico: [],
  fonte_efetiva: "ia",
  exportavel: false,
  motivo: "sem_rotulo_humano",
};

function rotulo(version: number, classificacao = SOCIAL, nome = "Ana Admin") {
  return {
    id: version,
    diagnostico_id: 101,
    version,
    classificacao,
    autor: { papel: "admin", nome },
    criado_em: `2026-08-1${version}T10:00:00Z`,
  };
}

function detalhe(extra: Record<string, unknown> = {}) {
  return {
    id: 101,
    paciente_id: "paciente-1",
    paciente: { id: "paciente-1", nome: "Ana Paula Ferreira" },
    data: "2026-08-12T12:00:00Z",
    status: "aguardando_revisao",
    erro: null,
    automatica: { classificacao: INTIMA, escala_saburra: null, confianca_ia: 0.87 },
    revisao: SEM_REVISAO,
    historico_revisoes: [],
    dataset: { disponivel: false, motivo: "exportacao_fora_do_escopo" },
    rotulo_dataset: SEM_ROTULO,
    imagem: { disponivel: false, motivo: "politica_de_acesso_pendente" },
    anamnese_id: 101,
    qtd_imagens: 1,
    ...extra,
  };
}

// a página espera o params carregar, então o teste espera também
async function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const params = Promise.resolve({ id: "101" });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>
          <DiagnosticoDetailAdminPage params={params} />
        </Suspense>
      </QueryClientProvider>,
    );
  });
}

describe("Detalhe do diagnóstico do admin", () => {
  it("mostra o paciente, a classificação da IA e indica onde exportar o dataset", async () => {
    server.use(http.get(url, () => HttpResponse.json(detalhe())));
    await renderPagina();

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Classificação da IA")).toBeInTheDocument();
    expect(screen.getByText("Escala de halitose 87%")).toBeInTheDocument();
    expect(screen.getByText("Aguardando revisão.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "fila de diagnósticos" })).toHaveAttribute(
      "href",
      "/admin/diagnosticos",
    );
    expect(
      screen.queryByText("A exportação do dataset ainda não faz parte do escopo."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "As respostas da anamnese e as fotos não ficam visíveis para o administrador.",
      ),
    ).toBeInTheDocument();
  });

  it("com revisão que mudou o nível, o do profissional vale e o da IA vira selo", async () => {
    const revisao = {
      status: "concluida",
      profissional_revisor_id: "prof-1",
      profissional_revisor_nome: "Dra. Beatriz",
      data_revisao: "2026-08-13T10:00:00Z",
      classificacao: SOCIAL,
      observacoes: "piorou depois da avaliação",
    };
    server.use(http.get(url, () => HttpResponse.json(detalhe({ status: "concluido", revisao }))));
    await renderPagina();

    expect(await screen.findByText("Resultado revisado")).toBeInTheDocument();
    // aparece no resultado e na linha da revisão, dentro do rótulo do dataset
    expect(screen.getAllByText("Mau Hálito Social")).toHaveLength(2);
    expect(screen.getByText(/IA: Halitose Íntima/)).toBeInTheDocument();
    expect(screen.getByText("Dra. Beatriz")).toBeInTheDocument();
    expect(screen.getByText("piorou depois da avaliação")).toBeInTheDocument();
  });

  it("diagnóstico com falha mostra o erro e não inventa classificação", async () => {
    const falha = detalhe({
      status: "falha",
      erro: "falha ao processar a imagem",
      automatica: { classificacao: null, escala_saburra: null, confianca_ia: null },
    });
    server.use(http.get(url, () => HttpResponse.json(falha)));
    await renderPagina();

    expect(await screen.findByText("falha ao processar a imagem")).toBeInTheDocument();
    expect(screen.getByText("Falha na análise")).toBeInTheDocument();
    expect(screen.queryByText("Ainda sem classificação.")).not.toBeInTheDocument();
  });

  it("diagnóstico que ainda não foi classificado avisa que não tem classificação", async () => {
    const processando = detalhe({
      status: "processando",
      automatica: { classificacao: null, escala_saburra: null, confianca_ia: null },
    });
    server.use(http.get(url, () => HttpResponse.json(processando)));
    await renderPagina();

    expect(await screen.findByText("Ainda sem classificação.")).toBeInTheDocument();
  });

  it("404: diz que não encontrou e não oferece tentar de novo", async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 404 })));
    await renderPagina();

    expect(await screen.findByText("Diagnóstico não encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("403: diz que não tem permissão e não oferece tentar de novo", async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 403 })));
    await renderPagina();

    expect(
      await screen.findByText("Você não tem permissão para ver este diagnóstico."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("erro de rede: avisa e deixa tentar de novo", async () => {
    let falhar = true;
    server.use(
      http.get(url, () =>
        falhar ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(detalhe()),
      ),
    );
    await renderPagina();

    expect(await screen.findByText("Não foi possível carregar o diagnóstico.")).toBeInTheDocument();

    falhar = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
  });
});

describe("Rótulo Hality do dataset", () => {
  const urlRotulo = `${url}/rotulos-dataset`;
  const concluido = { status: "concluido" };

  // devolve o detalhe com o rótulo que o "back" tem no momento
  function backComRotulo(estado: { rotulo: Record<string, unknown> }) {
    server.use(
      http.get(url, () =>
        HttpResponse.json(detalhe({ ...concluido, rotulo_dataset: estado.rotulo })),
      ),
    );
  }

  async function abrirDialog(user: ReturnType<typeof userEvent.setup>, botao = "Rotular") {
    await user.click(await screen.findByRole("button", { name: botao }));
    return screen.findByRole("dialog");
  }

  it("sem rótulo Hality: mostra IA, profissional e Hality separados e oferece rotular", async () => {
    backComRotulo({ rotulo: SEM_ROTULO });
    await renderPagina();

    expect(await screen.findByText("Sem rótulo Hality")).toBeInTheDocument();
    expect(screen.getByText("Sem revisão")).toBeInTheDocument();
    expect(screen.getByText(/Vale para o dataset/)).toHaveTextContent("classificação da IA");
    expect(screen.getByText(/Ainda não tem rótulo de uma pessoa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotular" })).toBeInTheDocument();
  });

  it("diagnóstico que ainda não foi concluído não pode ser rotulado", async () => {
    server.use(http.get(url, () => HttpResponse.json(detalhe())));
    await renderPagina();

    expect(await screen.findByText("Sem rótulo Hality")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rotular" })).not.toBeInTheDocument();
    expect(screen.getByText(/Só dá para rotular diagnóstico concluído/)).toBeInTheDocument();
  });

  it("com rótulo: mostra versão, autor e histórico, e oferece corrigir", async () => {
    backComRotulo({
      rotulo: {
        atual: rotulo(2),
        historico: [rotulo(1, INTIMA, "Bruno Admin")],
        fonte_efetiva: "hality",
        exportavel: true,
        motivo: null,
      },
    });
    await renderPagina();

    expect(await screen.findByText(/Versão 2 · Ana Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Versão 1 · Bruno Admin/)).toBeInTheDocument();
    expect(screen.getByText("Histórico do rótulo Hality")).toBeInTheDocument();
    expect(screen.getByText(/Vale para o dataset/)).toHaveTextContent("rótulo Hality");
    expect(screen.getByRole("button", { name: "Corrigir rótulo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rotular" })).not.toBeInTheDocument();
  });

  it("rotula: só salva depois de escolher, manda a versão 0 e mostra o rótulo novo", async () => {
    const estado = { rotulo: { ...SEM_ROTULO } as Record<string, unknown> };
    backComRotulo(estado);
    const corpos: unknown[] = [];
    server.use(
      http.post(urlRotulo, async ({ request }) => {
        corpos.push(await request.json());
        estado.rotulo = {
          atual: rotulo(1),
          historico: [],
          fonte_efetiva: "hality",
          exportavel: true,
          motivo: null,
        };
        return HttpResponse.json(rotulo(1), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    expect(within(dialog).getByRole("button", { name: "Salvar rótulo" })).toBeDisabled();
    expect(dialog).toHaveAccessibleName("Rotular para o dataset");
    expect(dialog).toHaveAccessibleDescription(/não muda o resultado do diagnóstico/);

    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    expect(await screen.findByText(/Versão 1 · Ana Admin/)).toBeInTheDocument();
    expect(corpos).toEqual([{ classificacao: "mau_halito_social", version: 0 }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Rótulo Hality salvo, versão 1.")).toBeInTheDocument();
    // o foco volta pro botão que abriu a janela
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Corrigir rótulo" })).toHaveFocus(),
    );
  });

  it("corrigir manda a versão atual e só libera salvar quando muda a escolha", async () => {
    backComRotulo({
      rotulo: { atual: rotulo(3), historico: [], fonte_efetiva: "hality", exportavel: true },
    });
    const corpos: unknown[] = [];
    server.use(
      http.post(urlRotulo, async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(rotulo(4, INTIMA), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user, "Corrigir rótulo");
    expect(within(dialog).getByRole("radio", { name: "Mau Hálito Social" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Salvar rótulo" })).toBeDisabled();

    await user.click(within(dialog).getByRole("radio", { name: "Halitose Íntima" }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    await waitFor(() => expect(corpos).toEqual([{ classificacao: "halitose_intima", version: 3 }]));
  });

  it("Escape fecha sem salvar", async () => {
    backComRotulo({ rotulo: SEM_ROTULO });
    let chamadas = 0;
    server.use(
      http.post(urlRotulo, () => {
        chamadas += 1;
        return HttpResponse.json(rotulo(1), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(chamadas).toBe(0);
    expect(screen.getByText("Sem rótulo Hality")).toBeInTheDocument();
  });

  it("clique duplo em salvar manda uma vez só", async () => {
    backComRotulo({ rotulo: SEM_ROTULO });
    let chamadas = 0;
    server.use(
      http.post(urlRotulo, async () => {
        chamadas += 1;
        await delay(50);
        return HttpResponse.json(rotulo(1), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.dblClick(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(chamadas).toBe(1);
  });

  it("409: pede pra recarregar e só deixa salvar de novo depois", async () => {
    const estado = { rotulo: { ...SEM_ROTULO } as Record<string, unknown> };
    backComRotulo(estado);
    server.use(
      http.post(urlRotulo, () => {
        // outra pessoa rotulou antes: o back já tem a versão 1
        estado.rotulo = {
          atual: rotulo(1, INTIMA, "Bruno Admin"),
          historico: [],
          fonte_efetiva: "hality",
          exportavel: true,
        };
        return HttpResponse.json({ detail: "versão desatualizada" }, { status: 409 });
      }),
    );
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Recarregue");
    expect(within(dialog).queryByRole("button", { name: "Salvar rótulo" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Recarregar" }));

    await waitFor(() => expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText(/Versão 1 · Bruno Admin/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Salvar rótulo" })).toBeInTheDocument();
  });

  it("sem conexão: avisa e mantém a escolha pra tentar de novo", async () => {
    backComRotulo({ rotulo: SEM_ROTULO });
    server.use(http.post(urlRotulo, () => HttpResponse.error()));
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Sem conexão");
    expect(within(dialog).getByRole("radio", { name: "Mau Hálito Social" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Salvar rótulo" })).toBeEnabled();
    expect(screen.getByText("Sem rótulo Hality")).toBeInTheDocument();
  });

  it.each([
    [403, "Você não tem permissão para rotular o dataset."],
    [404, "Diagnóstico não encontrado."],
    [422, "A classificação escolhida não é válida."],
    [500, "Não foi possível salvar agora."],
  ])("erro %i mostra o aviso certo e não finge que salvou", async (status, texto) => {
    backComRotulo({ rotulo: SEM_ROTULO });
    server.use(http.post(urlRotulo, () => new HttpResponse(null, { status })));
    const user = userEvent.setup();
    await renderPagina();

    const dialog = await abrirDialog(user);
    await user.click(within(dialog).getByRole("radio", { name: "Mau Hálito Social" }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar rótulo" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(texto);
    expect(screen.queryByText(/Rótulo Hality salvo/)).not.toBeInTheDocument();
  });
});

describe("Reclassificação pelo admin", () => {
  const revisado = {
    automatica: { classificacao: INTIMA, escala_saburra: null, confianca_ia: 0.87 },
    status: "concluido",
    revisao: {
      status: "concluida",
      profissional_revisor_id: "prof-1",
      profissional_revisor_nome: "Dra. Ana Souza",
      data_revisao: "2026-08-13T12:00:00Z",
      classificacao: INTIMA,
      observacoes: null,
    },
    reclassificacao: { version: 1, revisada_por_profissional: true },
  };
  const resposta = {
    revisao: {
      id: 2,
      version: 2,
      classificacao: SOCIAL,
      profissional_id: "admin-1",
      profissional_nome: "Admin",
      observacao: null,
      criado_em: "2026-08-14T12:00:00Z",
    },
    version: 2,
  };

  async function escolherEContinuar() {
    fireEvent.click(await screen.findByRole("button", { name: "Reclassificar" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Mau Hálito Social" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  }

  it("avisa que o profissional já revisou e será avisado, e só envia depois de confirmar", async () => {
    const patch = vi.fn();
    let corpo: unknown;
    server.use(
      http.get(url, () => HttpResponse.json(detalhe(revisado))),
      http.patch(`${url}/revisao`, async ({ request }) => {
        patch();
        corpo = await request.json();
        return HttpResponse.json(resposta);
      }),
    );
    await renderPagina();

    await escolherEContinuar();

    expect(await screen.findByText(/Dra\. Ana Souza já revisou este diagnóstico/)).toBeVisible();
    expect(screen.getByText(/recebe um e-mail avisando da mudança/)).toBeVisible();
    expect(patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar reclassificação" }));

    expect(await screen.findByText(/Reclassificação salva/)).toBeVisible();
    expect(corpo).toEqual({
      classificacao: "mau_halito_social",
      observacao: null,
      version: 1,
    });
  });

  it("sem revisão de profissional, a confirmação não fala em avisar ninguém além do paciente", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          detalhe({ reclassificacao: { version: 0, revisada_por_profissional: false } }),
        ),
      ),
    );
    await renderPagina();

    await escolherEContinuar();

    expect(await screen.findByText(/Nenhum profissional revisou/)).toBeVisible();
    expect(screen.queryByText(/já revisou este diagnóstico/)).not.toBeInTheDocument();
  });

  it("permite confirmar a classificação atual sem prometer aviso de mudança ao profissional", async () => {
    let corpo: unknown;
    server.use(
      http.get(url, () => HttpResponse.json(detalhe(revisado))),
      http.patch(`${url}/revisao`, async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({
          ...resposta,
          revisao: { ...resposta.revisao, classificacao: INTIMA },
        });
      }),
    );
    await renderPagina();

    fireEvent.click(await screen.findByRole("button", { name: "Reclassificar" }));

    expect(await screen.findByRole("radio", { name: "Halitose Íntima (atual)" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText(/sem alterar a escala/)).toBeVisible();
    expect(screen.queryByText(/recebe um e-mail avisando da mudança/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reclassificação" }));
    expect(await screen.findByText(/Reclassificação salva/)).toBeVisible();
    expect(corpo).toEqual({ classificacao: "halitose_intima", observacao: null, version: 1 });
  });

  it("409: pede para recarregar em vez de sobrescrever a revisão nova", async () => {
    server.use(
      http.get(url, () => HttpResponse.json(detalhe(revisado))),
      http.patch(`${url}/revisao`, () =>
        HttpResponse.json({ detail: "conflito" }, { status: 409 }),
      ),
    );
    await renderPagina();

    await escolherEContinuar();
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar reclassificação" }));

    expect(await screen.findByText(/O diagnóstico mudou enquanto você editava/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Confirmar reclassificação" }),
    ).not.toBeInTheDocument();
  });

  it("não oferece reclassificar diagnóstico que falhou", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json(
          detalhe({
            status: "falha",
            automatica: { classificacao: null, escala_saburra: null, confianca_ia: null },
            reclassificacao: { version: 0, revisada_por_profissional: false },
          }),
        ),
      ),
    );
    await renderPagina();

    await screen.findByText("Diagnóstico #101");
    expect(screen.queryByRole("button", { name: "Reclassificar" })).not.toBeInTheDocument();
  });
});
