"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiMockingGate } from "@/app/api-mocking-gate";
import { ApiError } from "@/lib/api-client";

/**
 * `useState(() => new QueryClient())` em vez de um client a nível de
 * módulo — cada requisição no servidor (SSR) precisaria do seu próprio
 * client; como Providers roda no navegador, isso também evita recriar o
 * client a cada re-render.
 */
/** Erro 4xx (não encontrado, sem acesso, inválido) não melhora tentando de novo. */
function deveRepetir(tentativas: number, erro: Error): boolean {
  if (erro instanceof ApiError && erro.status >= 400 && erro.status < 500) return false;
  return tentativas < 3;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: deveRepetir } } }),
  );

  return (
    <ApiMockingGate>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiMockingGate>
  );
}
