"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth-service";
import { useAsyncMutation } from "@/lib/async-hooks";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useAsyncMutation({
    mutationFn: ({ email, senha }: { email: string; senha: string }) =>
      authService.login(email, senha),
    onSuccess: (usuario) => {
      const redirect = searchParams.get("redirect");
      router.push(redirect ?? `/${usuario.role}`);
      router.refresh();
    },
  });
}

export function useRegistrar() {
  const router = useRouter();

  return useAsyncMutation({
    mutationFn: (input: Parameters<typeof authService.registrar>[0]) =>
      authService.registrar(input),
    onSuccess: (usuario) => {
      router.push(`/${usuario.role}`);
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return useAsyncMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });
}
