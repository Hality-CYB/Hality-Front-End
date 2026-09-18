"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diagnosticoService, type FiltroDiagnosticos } from "@/services/diagnostico-service";

export function useDiagnosticos(filtro: FiltroDiagnosticos = {}) {
  return useQuery({
    queryKey: ["diagnosticos", "lista", filtro],
    queryFn: () => diagnosticoService.listar(filtro),
  });
}

export function useDiagnosticosPaginados(filtro: Omit<FiltroDiagnosticos, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["diagnosticos", "paginado", filtro],
    queryFn: ({ pageParam }) => diagnosticoService.listar({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function useDiagnostico(id: string) {
  return useQuery({
    queryKey: ["diagnosticos", id],
    queryFn: () => diagnosticoService.buscar(id),
    enabled: !!id,
  });
}

export function useCriarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: diagnosticoService.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diagnosticos"] }),
  });
}

export function useRevisarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; nivel: 1 | 2 | 3; revisadoPor: string }) =>
      diagnosticoService.revisar(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diagnosticos"] }),
  });
}
