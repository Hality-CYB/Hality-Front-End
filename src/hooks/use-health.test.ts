import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHealth } from "@/hooks/use-health";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("useHealth", () => {
  it("retorna o status do backend quando a chamada funciona", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ status: "ok" });

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.data).toEqual({ status: "ok" }));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/health");
    expect(result.current.error).toBeNull();
  });

  it("expõe o erro quando a chamada falha", async () => {
    const failure = new Error("network down");
    vi.mocked(apiClient.get).mockRejectedValueOnce(failure);

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.data).toBeNull();
  });
});
