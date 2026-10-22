import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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

    expect(await screen.findByText("Resultado do profissional")).toBeInTheDocument();
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
