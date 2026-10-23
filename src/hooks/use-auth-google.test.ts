import React, { StrictMode, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthGoogle } from "@/hooks/use-auth-google";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const codigo = "codigo-temporario-de-uso-unico";

function Wrapper({ children }: { children: ReactNode }) {
  return React.createElement(
    StrictMode,
    null,
    React.createElement(QueryClientProvider, { client: new QueryClient() }, children),
  );
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

it("mantém o código do primeiro acesso só em memória e o esquece ao sair da página", async () => {
  window.history.replaceState(null, "", `/login/google?code=${codigo}&etapa=consentimento`);
  const { result } = renderHook(() => useAuthGoogle(), { wrapper: Wrapper });

  await waitFor(() => expect(result.current.status).toBe("consentimento"));
  expect(result.current.lerCodigo()).toBe(codigo);
  expect(window.location.search).toBe("");

  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(result.current.lerCodigo()).toBeNull();
});
