"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  diagnosticoService,
  type FiltroDiagnosticos,
  type FiltroDiagnosticosAdmin,
  type FiltroDiagnosticosProfissional,
} from "@/services/diagnostico-service";
import type { DiagnosticoNivel, DiagnosticoProfissional } from "@/types/diagnostico";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["profissional", "resumo"] });
    },
  });
}

export function useDiagnosticosProfissional(filtro: FiltroDiagnosticosProfissional = {}) {
  return useQuery({
    queryKey: ["diagnosticos", "profissional", "lista", filtro],
    queryFn: () => diagnosticoService.listarProfissional(filtro),
  });
}

export function useDiagnosticosProfissionalPaginados(
  filtro: Omit<FiltroDiagnosticosProfissional, "pagina"> = {},
) {
  return useInfiniteQuery({
    queryKey: ["diagnosticos", "profissional", "paginado", filtro],
    queryFn: ({ pageParam }) =>
      diagnosticoService.listarProfissional({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function useDiagnosticoProfissional(id: string) {
  return useQuery({
    queryKey: ["diagnosticos", "profissional", id],
    queryFn: () => diagnosticoService.buscarProfissional(id),
    enabled: !!id,
  });
}

export function useRevisarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      nivel: DiagnosticoNivel;
      observacoes?: string;
      versao: number;
    }) => diagnosticoService.revisar(id, input),
    // A próxima revisão precisa da versão nova já, sem esperar o refetch.
    onSuccess: ({ versao }, { id }) => {
      queryClient.setQueryData<DiagnosticoProfissional>(
        ["diagnosticos", "profissional", id],
        (atual) => (atual ? { ...atual, versao } : atual),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["profissional", "resumo"] });
    },
  });
}

export function useDiagnosticosAdmin(filtro: FiltroDiagnosticosAdmin = {}) {
  return useQuery({
    queryKey: ["diagnosticos", "admin", "lista", filtro],
    queryFn: () => diagnosticoService.listarAdmin(filtro),
  });
}

export function useDiagnosticosAdminPaginados(
  filtro: Omit<FiltroDiagnosticosAdmin, "pagina"> = {},
) {
  return useInfiniteQuery({
    queryKey: ["diagnosticos", "admin", "paginado", filtro],
    queryFn: ({ pageParam }) => diagnosticoService.listarAdmin({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function useDiagnosticoAdmin(id: string) {
  return useQuery({
    queryKey: ["diagnosticos", "admin", id],
    queryFn: () => diagnosticoService.buscarAdmin(id),
    enabled: !!id,
  });
}
