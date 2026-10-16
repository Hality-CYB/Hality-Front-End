"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dicaService, type FiltroDicas } from "@/services/dica-service";
import type { DicaInput } from "@/types/dica";

/** Conteúdos do admin (`/admin/conteudos`). Salvar também invalida a home. */
export function useDicas(filtro: FiltroDicas = {}, opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["dicas", "lista", filtro],
    queryFn: () => dicaService.listar(filtro),
    enabled: opcoes.enabled ?? true,
  });
}

export function useDicasPaginadas(filtro: Omit<FiltroDicas, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["dicas", "paginado", filtro],
    queryFn: ({ pageParam }) => dicaService.listar({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function useDica(id: string) {
  return useQuery({
    queryKey: ["dicas", "detalhe", id],
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
