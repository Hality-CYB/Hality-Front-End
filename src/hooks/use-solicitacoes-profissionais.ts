"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitacaoProfissionalService as service } from "@/services/solicitacao-profissional-service";
import type { StatusSolicitacao } from "@/types/solicitacao-profissional";

export function useSolicitarCadastroProfissional() {
  return useMutation({ mutationFn: service.solicitar, retry: false });
}

export function useSolicitacoesProfissionais(status: StatusSolicitacao) {
  return useInfiniteQuery({
    queryKey: ["solicitacoes-profissionais", status],
    queryFn: ({ pageParam }) => service.listar(status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.total_paginas ? ultima.pagina + 1 : undefined,
  });
}

export function useDecidirSolicitacaoProfissional() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decisao }: { id: string; decisao: "aprovada" | "recusada" }) =>
      service.decidir(id, decisao),
    retry: false,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["solicitacoes-profissionais"] });
      client.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: () => client.invalidateQueries({ queryKey: ["solicitacoes-profissionais"] }),
  });
}
