import {
  Home,
  Camera,
  ChartColumn,
  User,
  Users,
  Beaker,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/usuario";

export type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

/**
 * Itens de navegação por papel — usados tanto pelo Sidebar (desktop) quanto
 * pelo BottomNav (mobile), portados de NAV_TABS em Design/ (que existia
 * independentemente, com conteúdo diferente, em cada um dos 3 apps).
 *
 * Nota: só o admin não inclui "perfil" como aba própria — nos 3 papéis o
 * rodapé do Sidebar (avatar + nome + e-mail) também linka pro perfil; essa
 * assimetria já existia em Design/ e foi mantida como estava.
 */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  paciente: [
    { href: "/paciente", icon: Home, label: "Home" },
    { href: "/paciente/avaliacao", icon: Camera, label: "Diagnóstico" },
    { href: "/paciente/diagnosticos", icon: ChartColumn, label: "Progresso" },
    { href: "/paciente/perfil", icon: User, label: "Usuário" },
  ],
  profissional: [
    { href: "/profissional", icon: ChartColumn, label: "Início" },
    { href: "/profissional/diagnosticos", icon: Beaker, label: "Diagnósticos" },
    { href: "/profissional/pacientes", icon: Users, label: "Pacientes" },
    { href: "/profissional/perfil", icon: User, label: "Perfil" },
  ],
  admin: [
    { href: "/admin", icon: ChartColumn, label: "Início" },
    { href: "/admin/usuarios", icon: Users, label: "Usuários" },
    { href: "/admin/validacao", icon: Beaker, label: "Diagnósticos" },
    { href: "/admin/dicas", icon: Lightbulb, label: "Conteúdo" },
  ],
};

/** Link do rodapé do Sidebar (avatar/nome/e-mail), igual para os 3 papéis. */
export function perfilHref(role: Role): string {
  return `/${role}/perfil`;
}
