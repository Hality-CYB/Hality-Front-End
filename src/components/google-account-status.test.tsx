import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleAccountStatus } from "./google-account-status";

describe("informação do vínculo Google", () => {
  it("exibe o e-mail vinculado sem oferecer ação", () => {
    const { container } = render(
      <GoogleAccountStatus
        vinculo={{ vinculado: true, email: "paciente@gmail.com" }}
        carregando={false}
        erro={false}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Conta vinculada à paciente@gmail.com");
    expect(container.querySelector("button, a, [tabindex], [role='button']")).toBeNull();
  });

  it("informa ausência de vínculo somente após resposta confirmada", () => {
    const { rerender } = render(<GoogleAccountStatus carregando erro={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Consultando vínculo Google");
    rerender(
      <GoogleAccountStatus carregando={false} erro vinculo={{ vinculado: false, email: null }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível consultar");
    rerender(
      <GoogleAccountStatus
        carregando={false}
        erro={false}
        vinculo={{ vinculado: false, email: null }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sem vínculo Google");
  });

  it("preserva a indicação de vínculo legado sem inventar e-mail", () => {
    render(
      <GoogleAccountStatus
        vinculo={{ vinculado: true, email: null }}
        carregando={false}
        erro={false}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Conta vinculada ao Google");
  });
});
