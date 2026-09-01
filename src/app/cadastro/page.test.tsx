import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CadastroPage from "@/app/cadastro/page";
import { AuthProvider } from "@/hooks/use-auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("CadastroPage", () => {
  it("renderiza o formulário de cadastro com os campos requeridos", () => {
    render(
      <AuthProvider>
        <CadastroPage />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/Nome completo \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar senha \*/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Criar conta/i })).toBeInTheDocument();
  });

  it("exibe mensagem de erro se senhas não coincidirem", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CadastroPage />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/Nome completo \*/i), "Maria Clara");
    await user.type(screen.getByLabelText(/E-mail \*/i), "maria@hality.com");
    await user.type(screen.getByLabelText(/^Senha \*/i), "123456");
    await user.type(screen.getByLabelText(/Confirmar senha \*/i), "654321");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Criar conta/i }));

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("exibe erro se não aceitar os termos de uso", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CadastroPage />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/Nome completo \*/i), "Maria Clara");
    await user.type(screen.getByLabelText(/E-mail \*/i), "maria@hality.com");
    await user.type(screen.getByLabelText(/^Senha \*/i), "123456");
    await user.type(screen.getByLabelText(/Confirmar senha \*/i), "123456");
    await user.click(screen.getByRole("button", { name: /Criar conta/i }));

    expect(screen.getByText("Aceite os termos para continuar.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
