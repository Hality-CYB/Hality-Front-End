import React, { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogin, useRegistrar, useLogout } from "@/hooks/use-auth";
import { authService } from "@/services/auth-service";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@/services/auth-service", () => ({
  authService: {
    login: vi.fn(),
    registrar: vi.fn(),
    logout: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("use-auth hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useLogin redireciona para a rota do perfil após sucesso", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      id: "1",
      nome: "Maria",
      email: "maria@hality.com",
      role: "paciente",
      ativo: true,
    });

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: "maria@hality.com", senha: "senha" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPush).toHaveBeenCalledWith("/paciente");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("useRegistrar chama authService.registrar e redireciona", async () => {
    vi.mocked(authService.registrar).mockResolvedValueOnce({
      id: "2",
      nome: "Carlos",
      email: "carlos@hality.com",
      role: "profissional",
      ativo: true,
    });

    const { result } = renderHook(() => useRegistrar(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        nome: "Carlos",
        email: "carlos@hality.com",
        senha: "senha",
        telefone: "(11) 98888-7777",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPush).toHaveBeenCalledWith("/profissional");
  });

  it("useLogout chama authService.logout e redireciona para /login", async () => {
    vi.mocked(authService.logout).mockResolvedValueOnce();

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
