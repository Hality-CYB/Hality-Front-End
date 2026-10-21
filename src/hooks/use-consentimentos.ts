"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { consentimentoService } from "@/services/consentimento-service";
import type { DecisaoConsentimento } from "@/types/consentimento";

const CHAVE_TERMOS = ["consentimentos", "termos"];
const CHAVE_MEUS = ["consentimentos", "meus"];

export function useTermosConsentimento() {
  return useQuery({
    queryKey: CHAVE_TERMOS,
    queryFn: () => consentimentoService.listarTermos(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMeusConsentimentos(opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: CHAVE_MEUS,
    queryFn: () => consentimentoService.meus(),
    enabled: opcoes.enabled ?? true,
  });
}

export function useDecidirConsentimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (decisao: DecisaoConsentimento) => consentimentoService.decidir(decisao),
    // O back devolve o estado novo: usa direto, sem refetch.
    onSuccess: (estado) => queryClient.setQueryData(CHAVE_MEUS, estado),
    onError: (erro) => {
      // Termo mudou de versão: recarrega para a pessoa decidir na versão nova.
      if (erro instanceof ApiError && erro.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["consentimentos"] });
      }
    },
  });
}

export function mensagemErroConsentimento(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) {
    return "O termo foi atualizado. Leia a versão nova e decida de novo.";
  }
  return "Não foi possível salvar sua decisão. Tente novamente.";
}
