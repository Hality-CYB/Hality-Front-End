"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { anamneseService } from "@/services/anamnese-service";

export function useAnamnesePerguntas() {
  return useQuery({
    queryKey: ["anamnese", "questionario"],
    queryFn: () => anamneseService.listarPerguntas(),
  });
}

export function useCriarAnamnese() {
  return useMutation({
    mutationFn: anamneseService.criar,
  });
}
