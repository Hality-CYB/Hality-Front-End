import React, { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useLogin,
  useRegistrar,
  useLogout,
  useDefinirSenhaPeloLink,
  useConfirmarEmail,
  useReenviarConfirmacao,
} from "@/hooks/use-auth";
import { authService } from "@/services/auth-service";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/session";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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
    definirSenhaPeloLink: vi.fn(),
    confirmarEmail: vi.fn(),
    reenviarConfirmacao: vi.fn(),
  },
}));

function createWrapper(
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("use-auth hooks", () => {
  afterEach(clearStoredToken);
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

  it("useRegistrar chama authService.registrar sem redirecionar nem abrir sessão", async () => {
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
        dataNascimento: "1990-01-01",
        email: "carlos@hality.com",
        senha: "senha",
        telefone: "(11) 98888-7777",
        consentimentos: [{ finalidade: "health_data", versao: "v1", aceito: true }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPush).not.toHaveBeenCalled();
    expect(getStoredToken()).toBeNull();
  });

  it("useConfirmarEmail redireciona direto para /login após confirmar", async () => {
    vi.mocked(authService.confirmarEmail).mockResolvedValueOnce();

    const { result } = renderHook(() => useConfirmarEmail(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("t".repeat(32));
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authService.confirmarEmail).toHaveBeenCalledWith("t".repeat(32));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("useConfirmarEmail não redireciona quando a confirmação falha", async () => {
    vi.mocked(authService.confirmarEmail).mockRejectedValueOnce(new Error("falhou"));

    const { result } = renderHook(() => useConfirmarEmail(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("t".repeat(32));
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("useReenviarConfirmacao chama authService.reenviarConfirmacao", async () => {
    vi.mocked(authService.reenviarConfirmacao).mockResolvedValueOnce();

    const { result } = renderHook(() => useReenviarConfirmacao(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("maria@hality.com");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authService.reenviarConfirmacao).toHaveBeenCalledWith("maria@hality.com");
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

  it.each(["recuperacao", "convite"] as const)(
    "compartilha envios simultâneos de %s e preserva a sessão e o cache",
    async (finalidade) => {
      let finish: () => void = () => {};
      vi.mocked(authService.definirSenhaPeloLink).mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const client = new QueryClient();
      const cachedUser = { id: "outra-conta" };
      client.setQueryData(["currentUser"], cachedUser);
      client.setQueryData(["recurso-existente"], { preservado: true });
      const clearSpy = vi.spyOn(client, "clear");
      setStoredToken("access-existente");
      const { result } = renderHook(() => useDefinirSenhaPeloLink(finalidade), {
        wrapper: createWrapper(client),
      });
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.definir({
          token: "token-sintetico-somente-para-testes",
          senha: "NovaSenha123",
        });
        expect(
          result.current.definir({
            token: "outro-token-sintetico-para-teste",
            senha: "OutraSenha123",
          }),
        ).toBe(pending);
      });
      await waitFor(() => expect(authService.definirSenhaPeloLink).toHaveBeenCalledTimes(1));
      expect(authService.definirSenhaPeloLink).toHaveBeenCalledWith(finalidade, {
        token: "token-sintetico-somente-para-testes",
        senha: "NovaSenha123",
      });
      await act(async () => {
        finish();
        await pending;
      });
      expect(getStoredToken()).toBe("access-existente");
      expect(client.getQueryData(["currentUser"])).toBe(cachedUser);
      expect(client.getQueryData(["recurso-existente"])).toEqual({ preservado: true });
      expect(clearSpy).not.toHaveBeenCalled();
      clearSpy.mockRestore();
    },
  );
});
