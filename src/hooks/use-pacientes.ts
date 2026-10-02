"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pacienteService } from "@/services/paciente-service";

export function usePacientes(filtro?: { profissionalId?: string }) {
  return useQuery({
    queryKey: ["pacientes", filtro],
    queryFn: () => pacienteService.listar(filtro),
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: ["pacientes", id],
    queryFn: () => pacienteService.buscar(id),
    enabled: !!id,
  });
}

export function useCriarPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pacienteService.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
  });
}

export function useVincularProfissional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pacienteId, profissionalId }: { pacienteId: string; profissionalId: string }) =>
      pacienteService.vincularProfissional(pacienteId, profissionalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
  });
}
