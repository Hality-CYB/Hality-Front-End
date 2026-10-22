import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { config } from "@/lib/config";
import { clearStoredToken } from "@/lib/session";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  clearStoredToken();
  sessionStorage.clear();
  searchParams = new URLSearchParams();
});

describe("login com Google", () => {
  it("oferece uma navegação completa ao authorize somente para pacientes", () => {
    render(<LoginForm />, { wrapper: Wrapper });

    const google = screen.getByRole("link", { name: /Continuar com Google/ });
    expect(google).toHaveAttribute("href", `${config.apiBaseUrl}/api/v1/auth/google/authorize`);
    expect(google).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(google).toHaveAccessibleDescription("Disponível para pacientes");
  });

  it("mantém disponível o login tradicional por e-mail e senha", () => {
    render(<LoginForm />, { wrapper: Wrapper });

    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it.each(["/admin", "/admin/usuarios", "/profissional", "/profissional/perfil"])(
    "não oferece Google quando o destino é %s",
    (redirect) => {
      searchParams = new URLSearchParams({ redirect });
      render(<LoginForm />, { wrapper: Wrapper });

      expect(screen.queryByRole("link", { name: /Continuar com Google/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Disponível para pacientes")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    },
  );

  it("guarda um destino interno de paciente durante a navegação para o Google", () => {
    searchParams = new URLSearchParams({ redirect: "/paciente/perfil?aba=privacidade" });
    render(<LoginForm />, { wrapper: Wrapper });

    const google = screen.getByRole("link", { name: /Continuar com Google/ });
    google.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(google);

    expect(sessionStorage.getItem("hality:google_return_to")).toBe(
      "/paciente/perfil?aba=privacidade",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/paciente/../../admin",
    "javascript:alert(1)",
  ])("não oferece Google para um destino inseguro: %s", (redirect) => {
    searchParams = new URLSearchParams({ redirect });
    render(<LoginForm />, { wrapper: Wrapper });

    expect(screen.queryByRole("link", { name: /Continuar com Google/ })).not.toBeInTheDocument();
  });
});
