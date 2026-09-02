import type { ReactNode } from "react";

/**
 * Login usa o próprio layout cheio (sem card) — só register/esqueci-senha/
 * redefinir-senha usam o card via <AuthCard> (components/auth-card.tsx).
 * Esse layout de grupo fica só com o fundo, sem impor estrutura nenhuma.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background min-h-full">{children}</div>;
}
