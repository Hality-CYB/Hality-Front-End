"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth-service";
import { hasActiveSession } from "@/lib/session";

type LoginInput = {
  email: string;
  senha?: string;
  password?: string;
};

type RegisterInput = Parameters<typeof authService.registrar>[0];

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginInput) => authService.login(credentials),
    onSuccess: ({ usuario }) => {
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

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.getMe(),
    enabled: typeof window !== "undefined" && hasActiveSession(),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
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
  const { data: usuario, isSuccess } = useCurrentUser();

  useEffect(() => {
    if (isSuccess && usuario) {
      router.push(`/${usuario.role}`);
    }
  }, [isSuccess, usuario, router]);
}
