import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-client";
import { AvaliacaoWizard } from "@/components/avaliacao-wizard";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  criarAnamnese: vi.fn(),
  criarDiagnostico: vi.fn(),
  aguardarResultado: vi.fn(),
  questionario: {
    versao: "1",
    perguntas: [{ id: "p1", texto: "Você sente a boca seca?", tipo: "sim_nao", obrigatoria: true }],
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/use-anamnese", () => ({
  useAnamnesePerguntas: () => ({ data: mocks.questionario }),
  useCriarAnamnese: () => ({ mutateAsync: mocks.criarAnamnese }),
}));
vi.mock("@/hooks/use-diagnosticos", () => ({
  useCriarDiagnostico: () => ({ mutateAsync: mocks.criarDiagnostico }),
  useRevisarDiagnostico: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/use-pacientes", () => ({ usePaciente: () => ({ data: undefined }) }));
vi.mock("@/hooks/use-consentimentos", () => ({
  useMeusConsentimentos: () => ({ data: undefined }),
}));
vi.mock("@/services/diagnostico-service", () => ({
  diagnosticoService: { aguardarResultado: mocks.aguardarResultado },
}));

const TEXTO_FALHA = "Não conseguimos analisar a imagem";
const BOTAO_ORIENTACOES = "Ver orientações e tirar outra foto";

beforeEach(() => {
  // o jsdom não carrega imagem nem cria URL de arquivo, então o teste responde no lugar
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      url = "";
      set src(valor: string) {
        this.url = valor;
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
  mocks.criarAnamnese.mockResolvedValue({ id: "a1" });
  mocks.criarDiagnostico.mockResolvedValue({ id: "d1", status: "processando" });
  // a IA terminou em falha
  mocks.aguardarResultado.mockResolvedValue({ id: "d1", status: "falha", nivel: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function novaFoto() {
  return new File(["foto"], "lingua.jpg", { type: "image/jpeg" });
}

// passa pelas etapas até mandar a foto pra análise
async function enviarFoto(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(await screen.findByTestId("input-galeria"), novaFoto());
  const [usarFoto] = await screen.findAllByRole("button", { name: "Usar esta foto" });
  await user.click(usarFoto!);
}

async function irAteAFoto(user: ReturnType<typeof userEvent.setup>) {
  render(<AvaliacaoWizard voltarHref="/paciente" />);
  await user.click(screen.getByRole("button", { name: "Começar diagnóstico" }));
  await user.click(screen.getByRole("button", { name: "Sim" }));
  await user.click(screen.getByRole("button", { name: "Confirmar e continuar" }));
  await user.click(screen.getByRole("button", { name: "Preparar câmera" }));
}

describe("AvaliacaoWizard: falha na análise da imagem", () => {
  it("avisa com calma e oferece ver as orientações, sem o botão antigo", async () => {
    const user = userEvent.setup();
    await irAteAFoto(user);
    await enviarFoto(user);

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(TEXTO_FALHA);
    expect(aviso).toHaveTextContent(
      "Ocorreu um problema ao analisar a imagem. Certifique-se de seguir as orientações de captura da imagem e tente novamente.",
    );
    expect(screen.getByRole("button", { name: BOTAO_ORIENTACOES })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar outra foto" })).not.toBeInTheDocument();
  });

  it("volta pras orientações e não pede a anamnese de novo", async () => {
    const user = userEvent.setup();
    await irAteAFoto(user);
    await enviarFoto(user);

    await user.click(await screen.findByRole("button", { name: BOTAO_ORIENTACOES }));

    expect(screen.getByText("Orientações para a captura")).toBeInTheDocument();
    expect(screen.queryByText("Você sente a boca seca?")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("depois de ver as orientações, manda a foto nova com as mesmas respostas", async () => {
    const user = userEvent.setup();
    await irAteAFoto(user);
    await enviarFoto(user);
    await user.click(await screen.findByRole("button", { name: BOTAO_ORIENTACOES }));

    await user.click(screen.getByRole("button", { name: "Preparar câmera" }));
    await enviarFoto(user);

    await screen.findByRole("alert");
    expect(mocks.criarDiagnostico).toHaveBeenCalledTimes(2);
    expect(mocks.criarAnamnese).toHaveBeenCalledTimes(2);
    const [primeira, segunda] = mocks.criarAnamnese.mock.calls.map(([dados]) => dados.respostas);
    expect(segunda).toEqual(primeira);
    expect(segunda[0].valor).toBe("Sim");
  });
});

describe("AvaliacaoWizard: erros que não são falha da análise", () => {
  it.each([
    ["sem conexão", new TypeError("Failed to fetch"), "Tentar de novo"],
    ["imagem grande demais", new ApiError(413, ""), "Enviar outra foto"],
    ["sem consentimento", new ApiError(403, ""), "Ir para Privacidade"],
  ])("%s mantém o aviso e a ação de sempre", async (_nome, erro, botao) => {
    mocks.criarDiagnostico.mockRejectedValue(erro);
    const user = userEvent.setup();
    await irAteAFoto(user);
    await enviarFoto(user);

    const aviso = await screen.findByRole("alert");
    expect(aviso).not.toHaveTextContent(TEXTO_FALHA);
    expect(screen.getByRole("button", { name: botao })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: BOTAO_ORIENTACOES })).not.toBeInTheDocument();
  });
});
