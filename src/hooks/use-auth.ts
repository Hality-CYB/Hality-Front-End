"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, type RegisterInput } from "@/services/auth-service";
import { hasActiveSession } from "@/lib/session";
import type { UserUpdateInput } from "@/types/auth";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, senha }: { email: string; senha: string }) =>
      authService.login(email, senha),
    onSuccess: (usuario) => {
      queryClient.setQueryData(["currentUser"], usuario);
      const redirect = searchParams.get("redirect");
      router.push(redirect ?? `/${usuario.role}`);
      router.refresh();
    },
  });
}

export function useRegistrar() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.registrar(input),
    onSuccess: (usuario) => {
      queryClient.setQueryData(["currentUser"], usuario);
      router.push(`/${usuario.role}`);
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  });
}

/**
 * Redireciona para a área do usuário se já houver sessão ativa (detectada
 * pelo cookie fastapiusersauth). A proteção real é feita no servidor pelo
 * proxy.ts — este hook apenas evita o flash visual da tela de login.
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && hasActiveSession()) {
      router.push("/paciente");
    }
  }, [router]);
}

/**
 * Hook para recuperação de senha — envia e-mail sem expor se a conta existe.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.esqueciSenha(email),
  });
}

/**
 * Hook para redefinição de senha com token recebido por e-mail.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, novaSenha }: { token: string; novaSenha: string }) =>
      authService.redefinirSenha(token, novaSenha),
  });
}

/**
 * Busca os dados do usuário logado via GET /api/v1/users/me.
 * Cache de 5 min — revalida no foco da janela.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.obterUsuarioAtual(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/**
 * Atualiza nome e/ou telefone do usuário logado via PATCH /api/v1/users/me.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: UserUpdateInput) => authService.atualizarPerfil(dados),
    onSuccess: (usuarioAtualizado) => {
      queryClient.setQueryData(["currentUser"], usuarioAtualizado);
    },
  });
}
