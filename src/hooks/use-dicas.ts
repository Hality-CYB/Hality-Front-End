"use client";

import { useQuery } from "@tanstack/react-query";
import { dicaService } from "@/services/dica-service";

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
