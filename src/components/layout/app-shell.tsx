"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { Role } from "@/types/usuario";

type AppShellProps = {
  role: Role;
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
export function AppShell({ role, nome, email, children }: AppShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="bg-background shell:max-w-340 shell:flex-row shell:shadow-lg mx-auto flex h-full w-full max-w-120 flex-col">
      <Sidebar role={role} nome={nome} email={email} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar role={role} nome={nome} />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
        <BottomNav role={role} />
      </div>
    </div>
  );
}
