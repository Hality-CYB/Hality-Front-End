import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/login/page";
import { AuthProvider } from "@/hooks/use-auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("LoginPage", () => {
  it("renderiza o formulário de login com todos os campos e botões", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.getByText(/Não possui conta\?/i)).toBeInTheDocument();
  });

  it("exibe mensagem de erro se tentar submeter com campos vazios", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: /^Login$/i }));

    expect(screen.getByText("Preencha todos os campos.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
