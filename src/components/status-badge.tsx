import { cn } from "@/lib/utils";
import type { BadgeStatus } from "@/lib/level-format";

const STATUS_COLORS: Record<BadgeStatus, { bg: string; color: string }> = {
  success: { bg: "#D1FAE5", color: "#065F46" },
  warning: { bg: "#FEF3C7", color: "#92400E" },
  danger: { bg: "#FEE2E2", color: "#991B1B" },
  info: { bg: "var(--color-teal-100)", color: "var(--color-teal-800)" },
  neutral: { bg: "#F2F2F7", color: "#3C3C43" },
  pending: { bg: "#EDE9FE", color: "#5B21B6" },
};

type StatusBadgeProps = {
  label: string;
  status?: BadgeStatus;
  className?: string;
};

/**
 * Porta Design/'s Badge (shared/UI.tsx) — pílula colorida por status
 * (nível de diagnóstico, situação de usuário etc.), diferente do Badge do
 * shadcn (ui/badge.tsx), que só tem variantes genéricas sem esse mapeamento
 * de cor por significado.
 */
export function StatusBadge({ label, status = "info", className }: StatusBadgeProps) {
  const { bg, color } = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "font-heading inline-block rounded-4xl px-2.25 py-1 text-[11px] font-bold whitespace-nowrap",
        className,
      )}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
