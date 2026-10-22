"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, type RegisterInput } from "@/services/auth-service";
import { hasActiveSession } from "@/lib/session";
import type { DefinicaoDeSenha, FinalidadeDoLink } from "@/types/auth";

export { ConsentimentoObrigatorioError } from "@/services/auth-service";

export function useSolicitarRecuperacao() {
  return useMutation({
    mutationFn: authService.solicitarRecuperacao,
    retry: false,
    networkMode: "always",
  });
}

/**
 * Define a senha pelo link do e-mail. Senha e token ficam só numa ref durante
 * o envio, fora das variáveis e do cache da mutation, e um segundo clique
 * reaproveita o envio em andamento.
 */
export function useDefinirSenhaPeloLink(finalidade: FinalidadeDoLink) {
  const entradaRef = useRef<DefinicaoDeSenha | null>(null);
  const emAndamentoRef = useRef<Promise<void> | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const entrada = entradaRef.current;
      entradaRef.current = null;
      if (!entrada) throw new Error("Não foi possível concluir.");
      await authService.definirSenhaPeloLink(finalidade, entrada);
    },
    retry: false,
    // Falha na hora quando está offline, sem enfileirar token e senha para reenviar depois.
    networkMode: "always",
    gcTime: 0,
  });
  const { mutateAsync, reset } = mutation;
  useEffect(
    () => () => {
      entradaRef.current = null;
    },
    [],
  );
  function definir(entrada: DefinicaoDeSenha): Promise<void> {
    if (emAndamentoRef.current) return emAndamentoRef.current;
    entradaRef.current = entrada;
    const envio = mutateAsync().finally(() => {
      entradaRef.current = null;
      emAndamentoRef.current = null;
      reset();
    });
    emAndamentoRef.current = envio;
    return envio;
  }
  return { definir, enviando: mutation.isPending };
}

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

export function useRedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && hasActiveSession()) {
      router.push("/paciente");
    }
  }, [router]);
}
