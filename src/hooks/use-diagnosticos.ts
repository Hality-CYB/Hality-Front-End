"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diagnosticoService } from "@/services/diagnostico-service";

export function useDiagnosticos(filtro?: {
  pacienteId?: string;
  profissionalId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["diagnosticos", filtro],
    queryFn: () => diagnosticoService.listar(filtro),
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
