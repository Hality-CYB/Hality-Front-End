"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/types/usuario";

export type SessaoAtual = { id: string; nome: string; email: string; role: Role };

const SessaoContext = createContext<SessaoAtual | null>(null);

/** Provida uma vez em AppShell (dentro de cada app/<role>/layout.tsx). */
export function SessaoProvider({ value, children }: { value: SessaoAtual; children: ReactNode }) {
  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

/**
 * Dados do usuário logado (id/nome/email/role), disponíveis em qualquer
 * página cliente dentro de um app/<role>/. Substitui os *_ID_PLACEHOLDER
 * espalhados pelas páginas — o id real vem da sessão, não de um valor fixo.
 */
export function useSessaoAtual(): SessaoAtual {
  const sessao = useContext(SessaoContext);
  if (!sessao) {
    throw new Error("useSessaoAtual() precisa estar dentro de um app/<role>/layout.tsx");
  }
  return sessao;
}
