import Link from "next/link";
import Image from "next/image";
import { perfilHref } from "@/lib/nav-items";
import type { Role } from "@/types/usuario";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { BrandWordmark } from "@/components/brand-wordmark";
import cybIcon from "@/assets/images/icon-check-your-breath.png";

const ROLE_LABEL: Record<Role, string | undefined> = {
  paciente: undefined,
  profissional: "Profissional",
  admin: "Admin",
};

type TopBarProps = {
  role: Role;
  nome: string;
};

/**
 * Barra superior (mobile, < --breakpoint-shell). Porta o TopBar de
 * Design/ — lá o do paciente não tinha avatar clicável (só um espaçador);
 * aqui os 3 papéis ganham o atalho pro perfil, hoje só o paciente tinha
 * essa lacuna sem propósito nenhum.
 */
export function TopBar({ role, nome }: TopBarProps) {
  const roleLabel = ROLE_LABEL[role];

  return (
    <div className="border-border bg-card shell:hidden flex shrink-0 items-center justify-between border-b px-5 py-2">
      <div className="flex items-center gap-2.5">
        <Image src={cybIcon} alt="Check Your Breath" className="h-8 w-auto object-contain" />
        {roleLabel ? (
          <span className="text-muted-foreground font-heading text-[10px] font-semibold">
            {roleLabel}
          </span>
        ) : (
          <BrandWordmark className="text-[15px]" />
        )}
      </div>
      <Link href={perfilHref(role)}>
        <AvatarWithRole nome={nome} size={34} role={role === "paciente" ? undefined : role} />
      </Link>
    </div>
  );
}
