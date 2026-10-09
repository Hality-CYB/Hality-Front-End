"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { vinculoService, type FiltroVinculos } from "@/services/vinculo-service";

export function useVinculos(filtro: FiltroVinculos = {}, opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["vinculos", "lista", filtro],
    queryFn: () => vinculoService.listar(filtro),
    enabled: opcoes.enabled ?? true,
  });
}

export function useVinculosPaginados(filtro: Omit<FiltroVinculos, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["vinculos", "paginado", filtro],
    queryFn: ({ pageParam }) => vinculoService.listar({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

function invalidarVinculos(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["vinculos"] });
  queryClient.invalidateQueries({ queryKey: ["pacientes"] });
}

export function useCriarVinculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vinculoService.criar,
    onSuccess: () => invalidarVinculos(queryClient),
  });
}

export function useEncerrarVinculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vinculoService.encerrar(id),
    onSuccess: () => invalidarVinculos(queryClient),
  });
}

export function mensagemErroVinculo(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) {
    return "Esse paciente já está vinculado a esse profissional.";
  }
  return "Não foi possível vincular. Tente novamente.";
}
