"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav-items";
import type { Role } from "@/types/usuario";
import { cn } from "@/lib/utils";
import { useNavIndicator, useOptimisticActiveHref } from "@/hooks/use-nav-indicator";

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
  const realActiveHref = items.find((item) => isActive(item.href))?.href;
  const { activeHref, onNavigate } = useOptimisticActiveHref(pathname, realActiveHref);
  const { containerRef, registerItem, style: indicatorStyle } = useNavIndicator(activeHref ?? "");

  if (variant === "pill") {
    return (
      <nav className="bg-background shell:hidden shrink-0 px-6.25 pt-4 pb-6.25">
        <div
          ref={containerRef as RefObject<HTMLDivElement | null>}
          className="bg-card/85 relative flex items-center rounded-[296px] px-0.5 shadow-[0px_8px_40px_0px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        >
          <div
            aria-hidden="true"
            className="bg-muted absolute top-0 left-0 rounded-full"
            style={indicatorStyle}
          />
          {items.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.href)}
                className="flex flex-1 justify-center px-1 py-0.5"
              >
                <div
                  ref={registerItem(item.href)}
                  className="relative z-10 flex w-full flex-col items-center gap-0.25 rounded-full px-2 pt-1.5 pb-1.75 transition-transform duration-150 active:scale-95"
                >
                  <Icon className="h-5.5 w-5.5 text-[#1a1a1a]" />
                  <span
                    className={cn(
                      "text-[10px] leading-3 whitespace-nowrap text-[#1a1a1a]",
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
    <nav
      ref={containerRef}
      className="border-border bg-card shell:hidden relative flex shrink-0 items-center border-t px-2 pt-2.5 pb-6.5"
    >
      <div
        aria-hidden="true"
        className="bg-muted absolute top-0 left-0 rounded-[14px]"
        style={indicatorStyle}
      />
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.href)}
            className="flex flex-1 justify-center px-1 py-0.5"
          >
            <div
              ref={registerItem(item.href)}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 rounded-[14px] px-2.5 py-2 transition-transform duration-150 active:scale-95",
                active && "min-w-20",
              )}
            >
              <Icon
                className={cn(
                  "h-5.5 w-5.5 transition-colors duration-260",
                  active ? "text-foreground" : "text-gray-3",
                )}
              />
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap transition-colors duration-260",
                  active ? "text-foreground font-bold" : "text-gray-3 font-medium",
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
