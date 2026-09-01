"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth-service";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: ({ email, senha }: { email: string; senha: string }) =>
      authService.login(email, senha),
    onSuccess: (usuario) => {
      const redirect = searchParams.get("redirect");
      router.push(redirect ?? `/${usuario.role}`);
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });
}
