import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { LOGIN_ERROR_MESSAGE, useLogin } from "@/hooks/use-auth";
import { authService } from "@/services/auth-service";
import { clearStoredToken, getStoredToken } from "@/lib/session";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock("@/services/auth-service", () => ({
  authService: { login: vi.fn() },
}));

describe("useLogin", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearStoredToken();
  });

  it("salva o token e redireciona para a Home quando o login funciona", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      access_token: "token-123",
      token_type: "bearer",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login({ email: "paciente@hality.com", password: "123456" });
    });

    expect(getStoredToken()).toBe("token-123");
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("expõe apenas a mensagem genérica quando as credenciais são inválidas", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new Error("401 Unauthorized"));

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login({ email: "paciente@hality.com", password: "errada" });
    });

    await waitFor(() => expect(result.current.error).toBe(LOGIN_ERROR_MESSAGE));
    expect(getStoredToken()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
