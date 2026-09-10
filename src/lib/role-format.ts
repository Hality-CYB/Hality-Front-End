import type { Role } from "@/types/usuario";
import type { BadgeStatus } from "@/lib/level-format";

/** Portado de Design/'s AdminApp.tsx (roleLabel/roleBadge). */
export function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "profissional") return "Profissional";
  return "Paciente";
}

export function roleBadgeStatus(role: Role): BadgeStatus {
  if (role === "admin") return "danger";
  if (role === "profissional") return "info";
  return "neutral";
}
