import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConcordanciaIaCard } from "@/components/concordancia-ia";
import type { ConcordanciaIA } from "@/types/admin";
import type { DiagnosticoNivel } from "@/types/diagnostico";

function concordancia(celulas: Record<string, number>): ConcordanciaIA {
  const niveis: DiagnosticoNivel[] = [1, 2, 3];
  const matriz = niveis.flatMap((ia) =>
    niveis.map((revisao) => ({ ia, revisao, total: celulas[`${ia}${revisao}`] ?? 0 })),
  );
  const comparados = matriz.reduce((s, c) => s + c.total, 0);
  const concordantes = matriz.filter((c) => c.ia === c.revisao).reduce((s, c) => s + c.total, 0);
  return {
    comparados,
    concordantes,
    taxa: comparados ? concordantes / comparados : null,
    matriz,
  };
}

describe("ConcordanciaIaCard", () => {
  it("mostra a taxa, o acerto por nível e a troca que mais se repete", () => {
    render(
      <ConcordanciaIaCard concordancia={concordancia({ 11: 6, 12: 3, 22: 4, 33: 5, 32: 1 })} />,
    );

    expect(screen.getByText("79%")).toBeInTheDocument();
    expect(screen.getByText(/manteve o nível da IA em 15 de 19 diagnósticos/)).toBeInTheDocument();
    expect(screen.getByText("67% · 6 de 9")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A troca mais comum: a IA disse Hálito Normal e a revisão decidiu Halitose Íntima (3 diagnósticos).",
      ),
    ).toBeInTheDocument();
  });

  it("com empate entre as trocas, não escolhe uma ao acaso", () => {
    render(<ConcordanciaIaCard concordancia={concordancia({ 11: 4, 12: 1, 23: 1 })} />);

    expect(
      screen.getByText(/mudou o nível em 2 diagnósticos, sem uma troca que se repita/),
    ).toBeInTheDocument();
  });

  it("cada célula descreve o cruzamento e mostra o detalhe ao passar o mouse", () => {
    render(<ConcordanciaIaCard concordancia={concordancia({ 11: 3, 23: 1 })} />);

    const celula = screen.getByRole("button", {
      name: "IA: Halitose Íntima. Revisão: Mau Hálito Social. 1 diagnóstico, 25% dos revisados.",
    });
    fireEvent.mouseEnter(celula);

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "IA: Halitose Íntima → Revisão: Mau Hálito Social",
    );
  });

  it("sem revisões no período, explica em vez de mostrar uma matriz vazia", () => {
    render(<ConcordanciaIaCard concordancia={concordancia({})} />);

    expect(screen.getByText(/Ainda não há diagnósticos revisados/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("contra um back que ainda não manda a concordância, o card não aparece", () => {
    const { container } = render(<ConcordanciaIaCard concordancia={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
