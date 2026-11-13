import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContatosHality } from "@/components/contatos-hality";
import { AboutDialog } from "@/components/about-dialog";
import { linkEmail, linkWhatsApp, MENSAGEM_PROFISSIONAL } from "@/lib/contatos-hality";

// O next/image exige width e height fora do build; o teste só precisa do texto do Sobre.
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

describe("Contatos da Hality", () => {
  it("monta o WhatsApp e o e-mail reais, com mensagem e assunto opcionais", () => {
    expect(linkWhatsApp()).toBe("https://wa.me/5551985718061");
    expect(linkWhatsApp(MENSAGEM_PROFISSIONAL)).toBe(
      `https://wa.me/5551985718061?text=${encodeURIComponent(MENSAGEM_PROFISSIONAL)}`,
    );
    expect(linkEmail()).toBe("mailto:contato@hality.com.br");
    expect(linkEmail("Assunto")).toBe("mailto:contato@hality.com.br?subject=Assunto");
  });

  it("mostra WhatsApp, e-mail e as três redes como links", () => {
    render(<ContatosHality />);

    expect(screen.getByRole("link", { name: /WhatsApp \(51\) 98571-8061/ })).toHaveAttribute(
      "href",
      "https://wa.me/5551985718061",
    );
    expect(screen.getByRole("link", { name: "contato@hality.com.br" })).toHaveAttribute(
      "href",
      "mailto:contato@hality.com.br",
    );
    expect(screen.getByRole("link", { name: "Hality no Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/halitysaude",
    );
    expect(screen.getByRole("link", { name: "Hality no Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hality no YouTube" })).toBeInTheDocument();
  });

  it("aparece no Sobre", () => {
    render(<AboutDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("Fale com a Hality")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contato@hality.com.br" })).toBeInTheDocument();
  });
});
