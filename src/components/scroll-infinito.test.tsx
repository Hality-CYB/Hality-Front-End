import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScrollInfinito } from "@/components/scroll-infinito";

type Callback = (entradas: Array<{ isIntersecting: boolean }>) => void;
let observers: Array<{ callback: Callback; ativo: boolean }> = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      registro: { callback: Callback; ativo: boolean };
      constructor(callback: Callback) {
        this.registro = { callback, ativo: true };
        observers.push(this.registro);
      }
      observe() {}
      disconnect() {
        this.registro.ativo = false;
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

/** Simula o sentinela entrando na tela, só nos observers ainda ligados. */
function sentinelaVisivel() {
  act(() => {
    observers.filter((o) => o.ativo).forEach((o) => o.callback([{ isIntersecting: true }]));
  });
}

describe("ScrollInfinito", () => {
  it("pede a próxima página quando o fim da lista aparece", () => {
    const onCarregarMais = vi.fn();
    render(<ScrollInfinito temMais carregando={false} onCarregarMais={onCarregarMais} />);

    sentinelaVisivel();

    expect(onCarregarMais).toHaveBeenCalledTimes(1);
  });

  it("não pede de novo enquanto a página atual carrega", () => {
    const onCarregarMais = vi.fn();
    render(<ScrollInfinito temMais carregando onCarregarMais={onCarregarMais} />);

    sentinelaVisivel();

    expect(onCarregarMais).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando mais…");
  });

  it("volta a observar depois da carga, pra encher a tela se precisar", () => {
    const onCarregarMais = vi.fn();
    const { rerender } = render(
      <ScrollInfinito temMais carregando onCarregarMais={onCarregarMais} />,
    );
    rerender(<ScrollInfinito temMais carregando={false} onCarregarMais={onCarregarMais} />);

    sentinelaVisivel();

    expect(onCarregarMais).toHaveBeenCalledTimes(1);
  });

  it("some quando não há mais páginas", () => {
    const { container } = render(
      <ScrollInfinito temMais={false} carregando={false} onCarregarMais={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("depois de um erro, para de pedir sozinho e oferece tentar de novo", async () => {
    const onCarregarMais = vi.fn();
    render(<ScrollInfinito temMais carregando={false} erro onCarregarMais={onCarregarMais} />);

    sentinelaVisivel();
    expect(onCarregarMais).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar mais" }));
    expect(onCarregarMais).toHaveBeenCalledTimes(1);
  });
});
