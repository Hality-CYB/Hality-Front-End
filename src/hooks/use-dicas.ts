"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dicaService } from "@/services/dica-service";
import type { DicaInput } from "@/types/dica";

/** Conteúdos do admin (`/admin/conteudos`). Salvar também invalida a home. */
export function useDicas() {
  return useQuery({
    queryKey: ["dicas"],
    queryFn: () => dicaService.listar(),
  });
}

export function useDica(id: string) {
  return useQuery({
    queryKey: ["dicas", id],
    queryFn: () => dicaService.buscar(id),
    enabled: !!id,
  });
}

function invalidarDicas(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["dicas"] });
  queryClient.invalidateQueries({ queryKey: ["home"] });
}

export function useCriarDica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DicaInput) => dicaService.criar(input),
    onSuccess: () => invalidarDicas(queryClient),
  });
}

export function useAtualizarDica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<DicaInput> & { id: string }) =>
      dicaService.atualizar(id, input),
    onSuccess: () => invalidarDicas(queryClient),
  });
}

export function useRemoverDica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dicaService.remover(id),
    onSuccess: () => invalidarDicas(queryClient),
  });
}
