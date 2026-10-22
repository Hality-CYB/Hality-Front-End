"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import {
  usuarioService,
  type AtualizacaoPerfil,
  type AtualizacaoUsuarioAdmin,
  type FiltroUsuariosAdmin,
  type NovoUsuarioAdmin,
} from "@/services/usuario-service";

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

/** O back responde 400 quando a senha atual não confere. */
export function mensagemErroAlterarSenha(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 400) return "A senha atual está incorreta.";
  return "Não foi possível alterar a senha. Tente novamente.";
}

export function useAlterarSenha() {
  return useMutation({
    mutationFn: (input: { senhaAtual: string; novaSenha: string }) =>
      usuarioService.alterarSenha(input),
  });
}

// --- Admin ---

export function useUsuarios(filtro: FiltroUsuariosAdmin = {}, opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["usuarios", "lista", filtro],
    queryFn: () => usuarioService.listarAdmin(filtro),
    enabled: opcoes.enabled ?? true,
    refetchInterval: (query) =>
      query.state.data?.itens.some((usuario) => usuario.convitePendente) ? 15_000 : false,
  });
}

export function useUsuariosPaginados(filtro: Omit<FiltroUsuariosAdmin, "pagina"> = {}) {
  return useInfiniteQuery({
    queryKey: ["usuarios", "paginado", filtro],
    queryFn: ({ pageParam }) => usuarioService.listarAdmin({ ...filtro, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina < ultima.totalPaginas ? ultima.pagina + 1 : undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) => page.itens.some((usuario) => usuario.convitePendente))
        ? 15_000
        : false,
  });
}

export function useUsuario(id: string) {
  return useQuery({
    queryKey: ["usuarios", "detalhe", id],
    queryFn: () => usuarioService.buscarAdmin(id),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.convitePendente ? 15_000 : false),
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovoUsuarioAdmin) => usuarioService.criarAdmin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useReenviarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usuarioService.reenviarConvite(id),
    retry: false,
    networkMode: "always",
    onSuccess: (usuario) => {
      queryClient.setQueryData(["usuarios", "detalhe", usuario.id], usuario);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}

export function mensagemErroReenviarConvite(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 403) return "Você não tem permissão para reenviar convites.";
    if (erro.status === 404) return "Usuário não encontrado. Atualize a página.";
    if (erro.status === 409)
      return "Não é possível reenviar: a conta já está ativa ou o convite já foi aceito.";
    if (erro.status === 429) return "Muitas tentativas. Aguarde antes de tentar novamente.";
  }
  return "Não foi possível reenviar o convite. Verifique sua conexão e tente novamente.";
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizacaoUsuarioAdmin & { id: string }) =>
      usuarioService.atualizarAdmin(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["vinculos"] });
    },
  });
}

export function useAtualizarProfissional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      registro: string;
      especialidade: string;
      vinculadoHality: boolean;
    }) => usuarioService.atualizarProfissionalAdmin(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

/** O back responde 409 quando a mudança deixaria o sistema sem admin ativo. */
export function mensagemErroAtualizarUsuario(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) {
    return "Não dá para fazer isso: o sistema precisa de ao menos um administrador ativo.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

export function mensagemErroCriarUsuario(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) return "Esse e-mail já está cadastrado.";
  if (erro instanceof ApiError && erro.status === 422) {
    return "Confira o nome, o e-mail e os dados do usuário.";
  }
  return "Não foi possível criar o usuário. Tente novamente.";
}
