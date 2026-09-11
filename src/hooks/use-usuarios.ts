"use client";

import { usuarioService } from "@/services/usuario-service";
import { invalidateAsyncQueries, useAsyncMutation, useAsyncQuery } from "@/lib/async-hooks";

export function useUsuarios() {
  return useAsyncQuery({
    queryKey: ["usuarios"],
    queryFn: () => usuarioService.listar(),
  });
}

export function useUsuario(id: string) {
  return useAsyncQuery({
    queryKey: ["usuarios", id],
    queryFn: () => usuarioService.buscar(id),
    enabled: !!id,
  });
}

export function useCriarUsuario() {
  return useAsyncMutation({
    mutationFn: usuarioService.criar,
    onSuccess: () => invalidateAsyncQueries(["usuarios"]),
  });
}
