"use client";

/**
 * Contexto de autenticação — gerencia estado do usuário logado, token e
 * métodos de login/register/logout disponíveis em toda a aplicação.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService } from "@/services/auth-service";
import type { LoginInput, PatientRegisterInput, User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: PatientRegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tenta restaurar a sessão a partir do token salvo ao montar
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem("access_token");
      }
    }

    restoreSession().finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginInput) => {
    const response = await authService.login(credentials);
    localStorage.setItem("access_token", response.access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (data: PatientRegisterInput) => {
    const response = await authService.registerPatient(data);
    localStorage.setItem("access_token", response.access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para acessar o contexto de autenticação em qualquer componente. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return context;
}
