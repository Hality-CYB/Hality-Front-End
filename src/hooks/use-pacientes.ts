"use client";

import { useQuery } from "@tanstack/react-query";
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
