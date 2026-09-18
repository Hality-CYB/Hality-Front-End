import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ComponentProps } from "react";
import { CapturaLingua } from "@/components/captura/captura-lingua";

type Props = ComponentProps<typeof CapturaLingua>;

function renderCaptura(props: Partial<Props> = {}) {
  const callbacks = {
    onAlternarCamera: vi.fn(),
    onCapturar: vi.fn(),
    onGaleria: vi.fn(),
    onVoltar: vi.fn(),
    onUsarFoto: vi.fn(),
    onTirarOutra: vi.fn(),
  };
  const utils = render(
    <CapturaLingua
      videoRef={createRef<HTMLVideoElement>()}
      estadoCamera="ativa"
      podeAlternarCamera={false}
      foto={null}
      {...callbacks}
      {...props}
    />,
  );
  return { ...utils, ...callbacks };
}

function botaoVisivel(nome: string) {
  return screen.getAllByRole("button", { name: nome })[0]!;
}

describe("CapturaLingua", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ao vivo mostra o guia com máscara, o selo Pronto e a dica de posicionamento", () => {
    renderCaptura();

    expect(screen.getByTestId("guia-captura").firstElementChild).toHaveClass("guia-lingua-mascara");
    expect(screen.getByText("Pronto")).toBeInTheDocument();
    expect(
      screen.getByText("Coloque a língua para fora e encaixe na marcação"),
    ).toBeInTheDocument();
  });

  it("conta 3, 2, 1 antes de capturar e só então chama onCapturar", () => {
    vi.useFakeTimers();
    const { onCapturar } = renderCaptura();

    fireEvent.click(botaoVisivel("Capturar foto"));
    expect(screen.getByTestId("contagem-captura")).toHaveTextContent("3");
    expect(screen.getByText("Segure firme…")).toBeInTheDocument();
    expect(botaoVisivel("Capturar foto")).toBeDisabled();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("contagem-captura")).toHaveTextContent("2");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("contagem-captura")).toHaveTextContent("1");
    expect(onCapturar).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1000));
    expect(onCapturar).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("contagem-captura")).not.toBeInTheDocument();
  });

  it("sair da tela durante a contagem não captura", () => {
    vi.useFakeTimers();
    const { onCapturar, unmount } = renderCaptura();

    fireEvent.click(botaoVisivel("Capturar foto"));
    act(() => vi.advanceTimersByTime(1500));
    unmount();
    act(() => vi.advanceTimersByTime(5000));

    expect(onCapturar).not.toHaveBeenCalled();
  });

  it.each(["negada", "indisponivel", "erro"] as const)(
    "com a câmera %s, capturar chama onCapturar direto (câmera nativa) e não mostra o guia",
    (estadoCamera) => {
      const { onCapturar } = renderCaptura({ estadoCamera });

      fireEvent.click(botaoVisivel("Capturar foto"));

      expect(onCapturar).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("contagem-captura")).not.toBeInTheDocument();
      expect(screen.queryByTestId("guia-captura")).not.toBeInTheDocument();
    },
  );

  it("com a câmera em erro, avisa e mantém a região de dica anunciável montada", () => {
    renderCaptura({ estadoCamera: "erro" });

    expect(screen.getByText(/Não foi possível usar a câmera/)).toBeInTheDocument();
    expect(document.querySelector("[aria-live]")).toBeInTheDocument();
  });

  it("enquanto a câmera abre, o botão de captura fica desabilitado", () => {
    renderCaptura({ estadoCamera: "iniciando" });

    expect(botaoVisivel("Capturar foto")).toBeDisabled();
    expect(screen.getByText("Abrindo a câmera…")).toBeInTheDocument();
  });

  it("depois de capturar, mostra a foto na moldura e troca os botões para usar ou tirar outra", () => {
    const { onUsarFoto, onTirarOutra } = renderCaptura({
      foto: { previewUrl: "blob:foto", origem: "camera" },
    });

    expect(screen.getByAltText("Foto da língua")).toHaveAttribute("src", "blob:foto");
    expect(screen.queryByRole("button", { name: "Capturar foto" })).not.toBeInTheDocument();
    expect(screen.getByTestId("guia-captura").firstElementChild).not.toHaveClass(
      "guia-lingua-mascara",
    );

    fireEvent.click(botaoVisivel("Usar esta foto"));
    fireEvent.click(botaoVisivel("Tirar outra"));

    expect(onUsarFoto).toHaveBeenCalledTimes(1);
    expect(onTirarOutra).toHaveBeenCalledTimes(1);
  });

  it("foto da galeria aparece inteira e sem o guia", () => {
    renderCaptura({ foto: { previewUrl: "blob:galeria", origem: "galeria" } });

    expect(screen.getByAltText("Foto da língua")).toHaveClass("object-contain");
    expect(screen.queryByTestId("guia-captura")).not.toBeInTheDocument();
  });

  it("galeria, voltar e alternar câmera chamam seus callbacks", () => {
    const { onGaleria, onVoltar, onAlternarCamera } = renderCaptura({ podeAlternarCamera: true });

    fireEvent.click(botaoVisivel("Escolher da galeria"));
    fireEvent.click(botaoVisivel("Voltar"));
    fireEvent.click(
      screen.getByRole("button", { name: "Alternar entre câmera frontal e traseira" }),
    );

    expect(onGaleria).toHaveBeenCalledTimes(1);
    expect(onVoltar).toHaveBeenCalledTimes(1);
    expect(onAlternarCamera).toHaveBeenCalledTimes(1);
  });
});
