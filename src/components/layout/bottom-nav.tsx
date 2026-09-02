"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav-items";
import type { Role } from "@/types/usuario";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  role: Role;
};

/**
 * Navegação inferior (mobile, < --breakpoint-shell). Design/ tinha 2
 * estilos visuais diferentes por acidente (paciente = pill flutuante,
 * profissional/admin = barra plana) — viraram uma variante nomeada e
 * intencional, derivada do papel.
 */
export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const variant = role === "paciente" ? "pill" : "flat";

  const isActive = (href: string) => isNavItemActive(pathname, href, role);

  if (variant === "pill") {
    return (
      <nav className="bg-background shell:hidden shrink-0 px-6.25 pt-4 pb-6.25">
        <div className="bg-card/85 flex items-center rounded-[296px] px-0.5 shadow-[0px_8px_40px_0px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 justify-center px-1 py-0.5"
              >
                <div
                  className={cn(
                    "relative flex w-full flex-col items-center gap-0.25 rounded-full px-2 pt-1.5 pb-1.75",
                    active && "bg-muted",
                  )}
                >
                  <Icon className="relative z-1 h-5.5 w-5.5 text-[#1a1a1a]" />
                  <span
                    className={cn(
                      "relative z-1 text-[10px] leading-3 whitespace-nowrap text-[#1a1a1a]",
                      active ? "font-semibold" : "font-normal",
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-border bg-card shell:hidden flex shrink-0 items-center border-t px-2 pt-2.5 pb-6.5">
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex flex-1 justify-center px-1 py-0.5">
            <div
              className={cn(
                "flex flex-col items-center gap-1 rounded-[14px] px-2.5 py-2 transition-all duration-200",
                active ? "bg-muted text-foreground min-w-20" : "text-gray-3",
              )}
            >
              <Icon className="h-5.5 w-5.5" />
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  active ? "font-bold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
