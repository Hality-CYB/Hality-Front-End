"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuarioService, type AtualizacaoPerfil } from "@/services/usuario-service";

/** Mesma chave que o RoleLayout usa — salvar o perfil já atualiza nome e avatar no casco. */
const CHAVE_USUARIO_ATUAL = ["currentUser"];

export function useUsuarioAtual() {
  return useQuery({
    queryKey: CHAVE_USUARIO_ATUAL,
    queryFn: () => usuarioService.buscarAtual(),
  });
}

export function useAtualizarPerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AtualizacaoPerfil) => usuarioService.atualizarPerfil(input),
    onSuccess: (usuario) => queryClient.setQueryData(CHAVE_USUARIO_ATUAL, usuario),
  });
}

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
