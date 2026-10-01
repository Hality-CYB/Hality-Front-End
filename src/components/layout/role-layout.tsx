"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usuarioService } from "@/services/usuario-service";
import { hasActiveSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import type { Role } from "@/types/usuario";
import type { ReactNode } from "react";

/**
 * Client Component — sem cookie httpOnly, o servidor Next não tem como
 * verificar sessão antes de renderizar (o access_token só existe em
 * localStorage, do lado do navegador). Isso aqui é só UX: evita mostrar a
 * tela de um papel errado, redirecionando assim que sabe que não devia
 * estar aqui. A fronteira de segurança real é o FastAPI — cada endpoint
 * valida o Bearer por request, então mesmo se esse guard falhar ou piscar
 * a tela por um instante, nenhum dado autenticado vaza (as chamadas de
 * fato pra API é que vão receber 401).
 */
export function RoleLayout({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const logado = hasActiveSession();

  const {
    data: usuario,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => usuarioService.buscarAtual(),
    enabled: logado,
    retry: false,
  });

  useEffect(() => {
    if (!logado || isError) {
      router.replace(`/login?redirect=/${role}`);
      return;
    }
    if (usuario && usuario.role !== role) {
      router.replace(`/${usuario.role}`);
    }
  }, [logado, isError, usuario, role, router]);

  if (!logado || isLoading || isError || !usuario || usuario.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    );
  }

  return (
    <AppShell role={role} usuarioId={usuario.id} nome={usuario.nome} email={usuario.email}>
      {children}
    </AppShell>
  );
}
