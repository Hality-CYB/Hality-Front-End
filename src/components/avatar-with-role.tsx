import { Stethoscope, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarWithRoleProps = {
  nome: string;
  size?: number;
  role?: "profissional" | "admin";
  className?: string;
};

/**
 * Avatar de iniciais com selo de papel no canto (estetoscópio/escudo para
 * profissional/admin). Porta Design/'s Avatar (que já era compartilhado)
 * sobre o Avatar/AvatarFallback/AvatarBadge do shadcn.
 */
export function AvatarWithRole({ nome, size = 36, role, className }: AvatarWithRoleProps) {
  const badgeSize = Math.max(14, Math.round(size * 0.32));
  const squared = size > 44;

  return (
    <Avatar
      className={cn("shrink-0 after:hidden", className)}
      style={{
        width: size,
        height: size,
        borderRadius: squared ? 18 : 9999,
        background: "linear-gradient(160deg, #0b6b82, #0d8aa6)",
      }}
    >
      <AvatarFallback
        className="bg-transparent text-white"
        style={{
          borderRadius: squared ? 18 : 9999,
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: size * 0.38,
        }}
      >
        {nome.charAt(0).toUpperCase()}
      </AvatarFallback>
      {role && (
        <AvatarBadge
          style={{
            width: badgeSize,
            height: badgeSize,
            background:
              role === "admin"
                ? "linear-gradient(160deg, #d97706, #92400e)"
                : "linear-gradient(160deg, #2563eb, #1e40af)",
            border: "2px solid var(--card)",
          }}
        >
          {role === "profissional" ? (
            <Stethoscope
              style={{ width: badgeSize * 0.6, height: badgeSize * 0.6 }}
              strokeWidth={2.4}
              color="#fff"
            />
          ) : (
            <ShieldCheck
              style={{ width: badgeSize * 0.6, height: badgeSize * 0.6 }}
              strokeWidth={2.4}
              color="#fff"
            />
          )}
        </AvatarBadge>
      )}
    </Avatar>
  );
}
