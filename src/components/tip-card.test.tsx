import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipCard } from "@/components/tip-card";

describe("TipCard", () => {
  it("clicar no card abre o conteúdo inteiro num modal", async () => {
    render(
      <TipCard
        titulo="Escova e fio"
        categoria="higiene"
        blocos={[{ tipo: "imagem", url: "/foto.png", legenda: "Descrição completa da foto." }]}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Escova e fio/ }));

    const modal = await screen.findByRole("dialog", { name: "Escova e fio" });
    expect(within(modal).getByText("Descrição completa da foto.")).toBeInTheDocument();
    // alt vazio: a descrição já está na legenda logo abaixo, o leitor de tela não repete.
    // Caminho relativo é arquivo do back: ganha a base da API.
    expect(modal.querySelector("img")?.getAttribute("src")).toMatch(/^https?:\/\/.+\/foto\.png$/);
  });

  it("vídeo no card é só a capa, sem controles, e chama para assistir", () => {
    const { container } = render(
      <TipCard
        titulo="Como limpar a língua"
        categoria="rotina"
        blocos={[{ tipo: "video", url: "/video.mp4", legenda: "Passo a passo." }]}
      />,
    );
    expect(container.querySelector("video")).not.toHaveAttribute("controls");
    expect(screen.getByText("Assistir")).toBeInTheDocument();
  });
});
