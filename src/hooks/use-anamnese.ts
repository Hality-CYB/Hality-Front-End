"use client";

import { anamneseService } from "@/services/anamnese-service";
import { useAsyncMutation, useAsyncQuery } from "@/lib/async-hooks";

export function useAnamnesePerguntas() {
  return useAsyncQuery({
    queryKey: ["anamnese", "perguntas"],
    queryFn: () => anamneseService.listarPerguntas(),
  });
}

export function useAnamnese(id: string | undefined) {
  return useAsyncQuery({
    queryKey: ["anamnese", id],
    queryFn: () => anamneseService.buscar(id!),
    enabled: !!id,
  });
}

export function useCriarAnamnese() {
  return useAsyncMutation({
    mutationFn: anamneseService.criar,
  });
}
