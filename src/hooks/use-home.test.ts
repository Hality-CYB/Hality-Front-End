import React, { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHome } from "@/hooks/use-home";
import { homeService } from "@/services/home-service";
import type { HomeData } from "@/types/home";

vi.mock("@/services/home-service", () => ({
  homeService: { buscar: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna os dados agregados da Home quando a chamada funciona", async () => {
    const home: HomeData = {
      usuarioNome: "Lucas Gaelzer Machado",
      totalDiagnosticos: 0,
      avisosNaoLidos: 0,
      ultimoDiagnostico: null,
      totalDicas: 4,
      dicas: [{ id: 1, titulo: "O que é halitose?", conteudo: "..." }],
    };
    vi.mocked(homeService.buscar).mockResolvedValueOnce(home);

    const { result } = renderHook(() => useHome(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(home));
  });

  it("expõe o erro quando a chamada falha", async () => {
    vi.mocked(homeService.buscar).mockRejectedValueOnce(new Error("falha"));

    const { result } = renderHook(() => useHome(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
