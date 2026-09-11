"use client";

import { pacienteService } from "@/services/paciente-service";
import { useAsyncQuery } from "@/lib/async-hooks";

export function usePacientes(filtro?: { profissionalId?: string }) {
  return useAsyncQuery({
    queryKey: ["pacientes", filtro],
    queryFn: () => pacienteService.listar(filtro),
  });
}

export function usePaciente(id: string) {
  return useAsyncQuery({
    queryKey: ["pacientes", id],
    queryFn: () => pacienteService.buscar(id),
    enabled: !!id,
  });
}
