"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth-service";
import { hasActiveSession, setStoredToken } from "@/lib/session";
import type { LoginCredentials } from "@/types/auth";

/**
 * Mensagem única para qualquer falha de login (credenciais inválidas,
 * usuário inexistente, erro de rede, etc.) — nunca informamos qual campo
 * está errado, para não vazar se o e-mail existe na base.
 */
export const LOGIN_ERROR_MESSAGE =
  "E-mail ou senha inválidos. Verifique os dados e tente novamente.";

const HOME_ROUTE = "/";

/**
 * Hook da tela de login: dispara `authService.login`, persiste o token da
 * sessão (`session.ts`, consumido depois por todas as rotas via
 * `api-client.ts`) e redireciona para a Home.
 */
export function useLogin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const { access_token } = await authService.login(credentials);
        setStoredToken(access_token);
        router.push(HOME_ROUTE);
      } catch {
        setError(LOGIN_ERROR_MESSAGE);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return { login, isSubmitting, error };
}

/**
 * Garante a persistência da sessão do lado da tela de login: se já existe
 * um token válido salvo, pula direto para a Home em vez de mostrar o
 * formulário novamente.
 */
export function useRedirectIfAuthenticated(destination: string = HOME_ROUTE) {
  const router = useRouter();

  useEffect(() => {
    if (hasActiveSession()) {
      router.replace(destination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
}
