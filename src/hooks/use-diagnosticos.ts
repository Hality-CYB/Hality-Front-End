"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  diagnosticoService,
  type FiltroDiagnosticos,
  type FiltroDiagnosticosAdmin,
  type FiltroDiagnosticosProfissional,
} from "@/services/diagnostico-service";
import { ApiError } from "@/lib/api-client";
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

/** Gera o ZIP do dataset; o back revalida a elegibilidade de cada item. */
export function useExportarDataset() {
  return useMutation({
    mutationFn: (diagnosticoIds: string[]) => diagnosticoService.exportarDataset(diagnosticoIds),
  });
}

// rotular o dataset só muda o detalhe e as listas do admin
// não mexe no que o paciente ou o profissional veem, então essas telas não são recarregadas
export function useCriarRotuloDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; nivel: DiagnosticoNivel; versao: number }) =>
      diagnosticoService.criarRotuloDataset(id, input),
    // no 409 a tela também recarrega, porque a versão que ela tinha ficou velha
    onSettled: (_dados, _erro, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos", "admin", id] });
      queryClient.invalidateQueries({ queryKey: ["diagnosticos", "admin", "lista"] });
      queryClient.invalidateQueries({ queryKey: ["diagnosticos", "admin", "paginado"] });
    },
  });
}

export function useReclassificarDiagnostico() {
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
    }) => diagnosticoService.reclassificarAdmin(id, input),
    // No 409 também recarrega: a versão que a tela tinha ficou velha.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["diagnosticos", "admin"] }),
  });
}

/** Texto de cada erro da reclassificação; só o 409 pede para recarregar. */
export function erroDaReclassificacao(erro: unknown): { mensagem: string; desatualizado: boolean } {
  if (erro instanceof ApiError) {
    if (erro.status === 403) {
      return { mensagem: "Você não tem permissão para reclassificar.", desatualizado: false };
    }
    if (erro.status === 404) {
      return {
        mensagem: "Diagnóstico não encontrado. Ele pode ter sido removido.",
        desatualizado: false,
      };
    }
    if (erro.status === 409) {
      return {
        mensagem:
          "O diagnóstico mudou enquanto você editava. Recarregue para ver a revisão atual e decidir de novo.",
        desatualizado: true,
      };
    }
  }
  return {
    mensagem: "Não foi possível salvar agora. Tente de novo em instantes.",
    desatualizado: false,
  };
}

export function useDiagnosticoAdmin(id: string) {
  return useQuery({
    queryKey: ["diagnosticos", "admin", id],
    queryFn: () => diagnosticoService.buscarAdmin(id),
    enabled: !!id,
  });
}
