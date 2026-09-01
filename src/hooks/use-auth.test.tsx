import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth-service";

vi.mock("@/services/auth-service", () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    registerPatient: vi.fn(),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("inicia sem usuário quando não há token no localStorage", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("restaura a sessão quando há token no localStorage", async () => {
    localStorage.setItem("access_token", "valid-token");
    const mockUser = {
      id: 1,
      name: "João Silva",
      email: "joao@hality.com",
      phone: null,
      role: "patient" as const,
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    };
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("executa login com sucesso", async () => {
    const mockUser = {
      id: 2,
      name: "Ana Costa",
      email: "ana@hality.com",
      phone: null,
      role: "patient" as const,
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    };
    vi.mocked(authService.login).mockResolvedValueOnce({
      access_token: "new-token",
      token_type: "bearer",
    });
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "ana@hality.com", password: "123" });
    });

    expect(localStorage.getItem("access_token")).toBe("new-token");
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("executa logout limpando token e usuário", async () => {
    localStorage.setItem("access_token", "token-to-clear");
    const mockUser = {
      id: 3,
      name: "Pedro",
      email: "pedro@hality.com",
      phone: null,
      role: "patient" as const,
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    };
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
