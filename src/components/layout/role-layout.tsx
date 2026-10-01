"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usuarioService } from "@/services/usuario-service";
import { hasActiveSession } from "@/lib/session";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
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
    error,
    refetch,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => usuarioService.buscarAtual(),
    enabled: logado,
    retry: false,
  });

  // Só 401 significa "sessão inválida" (o api-client já limpou o token nesse
  // caso). Rede fora do ar / 5xx não pode mandar pro login: o login vê o
  // token ainda salvo e devolve pra cá, gerando um loop de redirect.
  const sessaoInvalida = isError && error instanceof ApiError && error.status === 401;
  const erroDeConexao = isError && !sessaoInvalida;

  useEffect(() => {
    if (!logado || sessaoInvalida) {
      router.replace(`/login?redirect=/${role}`);
      return;
    }
    if (usuario && usuario.role !== role) {
      router.replace(`/${usuario.role}`);
    }
  }, [logado, sessaoInvalida, usuario, role, router]);

  if (erroDeConexao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Não foi possível carregar sua sessão.</p>
        <p className="text-muted-foreground text-sm">
          Verifique sua conexão ou se o servidor está no ar e tente novamente.
        </p>
        <Button onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  if (!logado || isLoading || sessaoInvalida || !usuario || usuario.role !== role) {
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
