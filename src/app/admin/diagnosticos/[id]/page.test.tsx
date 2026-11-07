import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
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
  it("mostra o paciente, a classificação da IA e o dataset indisponível", async () => {
    server.use(http.get(url, () => HttpResponse.json(detalhe())));
    await renderPagina();

    expect(await screen.findByText("Ana Paula Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Classificação da IA")).toBeInTheDocument();
    expect(screen.getByText("Escala de halitose 87%")).toBeInTheDocument();
    expect(screen.getByText("Aguardando revisão.")).toBeInTheDocument();
    expect(screen.getByText("Indisponível")).toBeInTheDocument();
    expect(
      screen.getByText("A exportação do dataset ainda não faz parte do escopo."),
    ).toBeInTheDocument();
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
    expect(screen.getByText("Mau Hálito Social")).toBeInTheDocument();
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

  it("não deixa continuar com a classificação que já está valendo", async () => {
    server.use(http.get(url, () => HttpResponse.json(detalhe(revisado))));
    await renderPagina();

    fireEvent.click(await screen.findByRole("button", { name: "Reclassificar" }));

    expect(await screen.findByRole("radio", { name: "Halitose Íntima (atual)" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
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
