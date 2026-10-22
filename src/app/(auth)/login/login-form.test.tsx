import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { config } from "@/lib/config";
import { clearStoredToken } from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
});
