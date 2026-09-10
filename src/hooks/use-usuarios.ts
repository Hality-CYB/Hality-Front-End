"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuarioService } from "@/services/usuario-service";

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: () => usuarioService.listar(),
  });
}

export function useUsuario(id: string) {
  return useQuery({
    queryKey: ["usuarios", id],
    queryFn: () => usuarioService.buscar(id),
    enabled: !!id,
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usuarioService.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
