"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, perfilHref, isNavItemActive } from "@/lib/nav-items";
import type { Role } from "@/types/usuario";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { BrandWordmark } from "@/components/brand-wordmark";
import { cn } from "@/lib/utils";
import { useNavIndicator, useOptimisticActiveHref } from "@/hooks/use-nav-indicator";
import cybIcon from "@/assets/images/icon-check-your-breath.png";

const ROLE_LABEL: Record<Role, string | undefined> = {
  paciente: undefined,
  profissional: "Profissional",
  admin: "Admin",
};

type SidebarProps = {
  role: Role;
  nome: string;
  email: string;
};

/**
 * Navegação lateral (desktop, >= --breakpoint-shell). Porta o Sidebar que
 * existia independentemente (e quase idêntico) nos 3 apps de Design/.
 */
export function Sidebar({ role, nome, email }: SidebarProps) {
  const pathname = usePathname();
  const roleLabel = ROLE_LABEL[role];
  const items = NAV_ITEMS[role];
  const profileHref = perfilHref(role);

  const realActiveHref = items.find((item) => isNavItemActive(pathname, item.href, role))?.href;
  const { activeHref, onNavigate } = useOptimisticActiveHref(pathname, realActiveHref);
  const {
    containerRef,
    registerItem,
    style: indicatorStyle,
  } = useNavIndicator<HTMLDivElement>(activeHref ?? "");

  return (
    <nav className="border-border bg-sidebar shell:flex hidden w-65 shrink-0 flex-col overflow-y-auto border-r p-3.5">
      <div className="flex items-center gap-2.5 px-2.5 pt-1 pb-6">
        <Image src={cybIcon} alt="Check Your Breath" className="h-7.5 w-auto object-contain" />
        <div>
          <BrandWordmark className="text-sm" />
          {roleLabel && (
            <div className="text-muted-foreground text-[10px] font-semibold">{roleLabel}</div>
          )}
        </div>
      </div>
      <div ref={containerRef} className="relative flex flex-1 flex-col gap-0.5">
        <div
          aria-hidden="true"
          className="bg-secondary absolute top-0 left-0 rounded-xl"
          style={indicatorStyle}
        />
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={registerItem(item.href)}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.75 text-sm transition-colors duration-260",
                active
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:bg-muted/60 font-medium duration-150",
              )}
            >
              <Icon className="h-5.5 w-5.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <Link
        href={profileHref}
        className={cn(
          "mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2.5",
          pathname === profileHref || pathname.startsWith(`${profileHref}/`) ? "bg-secondary" : "",
        )}
      >
        <AvatarWithRole nome={nome} size={34} role={role === "paciente" ? undefined : role} />
        <div className="min-w-0">
          <div className="font-heading truncate text-[13px] font-bold">{nome}</div>
          <div className="text-muted-foreground truncate text-[11px]">{email}</div>
        </div>
      </Link>
    </nav>
  );
}
