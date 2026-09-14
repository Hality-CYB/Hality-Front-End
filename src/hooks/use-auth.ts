"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, type RegisterInput } from "@/services/auth-service";
import { hasActiveSession } from "@/lib/session";

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
