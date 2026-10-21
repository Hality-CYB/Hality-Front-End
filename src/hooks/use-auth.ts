"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, type RegisterInput } from "@/services/auth-service";
import { hasActiveSession } from "@/lib/session";
import type { IdentityConfirmation, IdentityPurpose } from "@/types/auth";

export { ConsentimentoObrigatorioError } from "@/services/auth-service";

export function useSolicitarRecuperacao() {
  return useMutation({
    mutationFn: authService.solicitarRecuperacao,
    retry: false,
    networkMode: "always",
  });
}

export function useConfirmarIdentidade(purpose: IdentityPurpose) {
  const inputRef = useRef<IdentityConfirmation | null>(null);
  const pendingRef = useRef<Promise<void> | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const input = inputRef.current;
      inputRef.current = null;
      if (!input) throw new Error("Não foi possível concluir a solicitação.");
      await authService.confirmarIdentidade(purpose, input);
    },
    retry: false,
    // Falha offline imediatamente, sem enfileirar token/senha para enviar ao reconectar.
    networkMode: "always",
    gcTime: 0,
  });
  const { mutateAsync, reset } = mutation;
  useEffect(
    () => () => {
      inputRef.current = null;
    },
    [],
  );
  function confirmar(input: IdentityConfirmation): Promise<void> {
    if (pendingRef.current) return pendingRef.current;
    inputRef.current = input;
    // Não guarda senha ou token nas variáveis/cache da mutation.
    const pending = mutateAsync().finally(() => {
      inputRef.current = null;
      pendingRef.current = null;
      reset();
    });
    pendingRef.current = pending;
    return pending;
  }
  return { confirmar, isPending: mutation.isPending };
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
