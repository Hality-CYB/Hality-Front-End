"use client";

import { diagnosticoService } from "@/services/diagnostico-service";
import { invalidateAsyncQueries, useAsyncMutation, useAsyncQuery } from "@/lib/async-hooks";

export function useDiagnosticos(filtro?: {
  pacienteId?: string;
  profissionalId?: string;
  status?: string;
}) {
  return useAsyncQuery({
    queryKey: ["diagnosticos", filtro],
    queryFn: () => diagnosticoService.listar(filtro),
  });
}

export function useDiagnostico(id: string) {
  return useAsyncQuery({
    queryKey: ["diagnosticos", id],
    queryFn: () => diagnosticoService.buscar(id),
    enabled: !!id,
  });
}

export function useCriarDiagnostico() {
  return useAsyncMutation({
    mutationFn: diagnosticoService.criar,
    onSuccess: () => invalidateAsyncQueries(["diagnosticos"]),
  });
}

export function useRevisarDiagnostico() {
  return useAsyncMutation({
    mutationFn: ({ id, ...input }: { id: string; nivel: 1 | 2 | 3; revisadoPor: string }) =>
      diagnosticoService.revisar(id, input),
    onSuccess: () => invalidateAsyncQueries(["diagnosticos"]),
  });
}
