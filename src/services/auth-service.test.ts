import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";
import { authService } from "@/services/auth-service";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("authService", () => {
  it("registerPatient faz chamada POST para /api/v1/auth/register-patient", async () => {
    const input = {
      name: "Maria Silva",
      email: "maria@hality.com",
      phone: "(11) 99999-9999",
      password: "SenhaSegura123",
    };
    const mockResponse = { access_token: "jwt-token-xyz", token_type: "bearer" };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await authService.registerPatient(input);

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/register-patient", input);
    expect(result).toEqual(mockResponse);
  });

  it("login faz chamada POST para /api/v1/auth/login", async () => {
    const credentials = { email: "maria@hality.com", password: "SenhaSegura123" };
    const mockResponse = { access_token: "jwt-token-xyz", token_type: "bearer" };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await authService.login(credentials);

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/login", credentials);
    expect(result).toEqual(mockResponse);
  });

  it("getCurrentUser faz chamada GET para /api/v1/auth/me", async () => {
    const mockUser = {
      id: 1,
      name: "Maria Silva",
      email: "maria@hality.com",
      phone: "(11) 99999-9999",
      role: "patient",
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockUser);

    const result = await authService.getCurrentUser();

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/auth/me");
    expect(result).toEqual(mockUser);
  });
});
