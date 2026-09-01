import type { DiagnosticoNivel } from "@/types/diagnostico";

/**
 * Cor/rótulo/status por nível de halitose. Portado de Design/ onde
 * levelColor/levelLabel/levelBadge existiam (byte-idênticos) em
 * PatientApp.tsx, ProfessionalApp.tsx e AdminApp.tsx.
 */

export type BadgeStatus = "success" | "warning" | "danger" | "info" | "neutral" | "pending";

export function nivelColor(nivel: DiagnosticoNivel | null): string {
  if (nivel === null) return "#6b7280";
  if (nivel === 1) return "#16a34a";
  if (nivel === 2) return "#ff9500";
  return "#ff3b30";
}

export function nivelLabel(nivel: DiagnosticoNivel | null): string {
  if (nivel === null) return "Pendente";
  if (nivel === 1) return "Hálito Normal";
  if (nivel === 2) return "Halitose Íntima";
  return "Mau Hálito Social";
}

export function nivelBadgeStatus(nivel: DiagnosticoNivel | null): BadgeStatus {
  if (nivel === null) return "pending";
  if (nivel === 1) return "success";
  if (nivel === 2) return "warning";
  return "danger";
}
