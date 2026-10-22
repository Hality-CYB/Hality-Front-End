"use client";

import { useQuery } from "@tanstack/react-query";
import { classificacaoService } from "@/services/classificacao-service";

/** Tabela de referência: não muda durante o uso, então não refaz a busca. */
export function useClassificacoes() {
  return useQuery({
    queryKey: ["classificacoes"],
    queryFn: () => classificacaoService.listar(),
    staleTime: Infinity,
  });
}
