"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dicaService } from "@/services/dica-service";
import type { Dica } from "@/types/dica";

/**
 * Mesma chave de cache pros 3 papéis — quando o admin editar/publicar uma
 * dica (fase 4), invalidar ["dicas"] faz paciente e profissional
 * revalidarem também. É essa unificação que resolve o bug real que
 * existia em Design/ (edição do admin nunca chegava aos outros papéis).
 */
export function useDicas(filtro?: { publicado?: boolean }) {
  return useQuery({
    queryKey: ["dicas", filtro],
    queryFn: () => dicaService.listar(filtro),
  });
}

export function useDica(id: string) {
  return useQuery({
    queryKey: ["dicas", id],
    queryFn: () => dicaService.buscar(id),
    enabled: !!id,
  });
}

type NovaDica = Omit<Dica, "id" | "criadoEm" | "visualizacoes">;

export function useCriarDica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dica: NovaDica) => dicaService.criar(dica),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dicas"] }),
  });
}

export function useAtualizarDica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dica }: Partial<NovaDica> & { id: string }) =>
      dicaService.atualizar(id, dica),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dicas"] }),
  });
}
