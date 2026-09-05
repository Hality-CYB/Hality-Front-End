"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { anamneseService } from "@/services/anamnese-service";

export function useAnamnesePerguntas() {
  return useQuery({
    queryKey: ["anamnese", "perguntas"],
    queryFn: () => anamneseService.listarPerguntas(),
  });
}

export function useAnamnese(id: string | undefined) {
  return useQuery({
    queryKey: ["anamnese", id],
    queryFn: () => anamneseService.buscar(id!),
    enabled: !!id,
  });
}

export function useCriarAnamnese() {
  return useMutation({
    mutationFn: anamneseService.criar,
  });
}
