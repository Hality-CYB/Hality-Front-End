"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiMockingGate } from "@/app/api-mocking-gate";

/**
 * `useState(() => new QueryClient())` em vez de um client a nível de
 * módulo — cada requisição no servidor (SSR) precisaria do seu próprio
 * client; como Providers roda no navegador, isso também evita recriar o
 * client a cada re-render.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ApiMockingGate>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiMockingGate>
  );
}
