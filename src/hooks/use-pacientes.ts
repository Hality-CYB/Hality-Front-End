"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pacienteService, type FiltroPacientes } from "@/services/paciente-service";
import { vinculoService } from "@/services/vinculo-service";

export function usePacientes(filtro: FiltroPacientes = {}) {
  return useQuery({
    queryKey: ["pacientes", "lista", filtro],
    queryFn: () => pacienteService.listar(filtro),
  });
}

export function usePacientesPaginados(filtro: Omit<FiltroPacientes, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["pacientes", "paginado", filtro],
    queryFn: ({ pageParam }) => pacienteService.listar({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: ["pacientes", id],
    queryFn: () => pacienteService.buscar(id),
    enabled: !!id,
  });
}

export function useVincularPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pacienteEmail: string) => vinculoService.vincular(pacienteEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["profissional", "resumo"] });
    },
  });
}
