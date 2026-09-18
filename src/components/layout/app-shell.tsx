"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SessaoProvider } from "@/lib/auth/session-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Role } from "@/types/usuario";

export const DESKTOP_QUERY = "(min-width: 860px)";

type AppShellProps = {
  role: Role;
  usuarioId: string;
  nome: string;
  email: string;
  children: ReactNode;
};

/**
 * Casco do app por papel: sidebar + grid no desktop (>= --breakpoint-shell),
 * coluna de celular com top bar + bottom nav abaixo disso. Porta o
 * .cyb-shell/.cyb-sidebar/.cyb-main-col de Design/'s index.css como
 * componente em vez de classes globais.
 */
export function AppShell({ role, usuarioId, nome, email, children }: AppShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell:flex-row flex min-h-0 w-full flex-1 flex-col">
      <Sidebar role={role} nome={nome} email={email} />
      <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar role={role} nome={nome} />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div key={pathname} className={isDesktop ? "page-enter-desktop" : "page-enter"}>
            <SessaoProvider value={{ id: usuarioId, nome, email, role }}>{children}</SessaoProvider>
          </div>
        </div>
        <BottomNav role={role} />
      </div>
    </div>
  );
}
