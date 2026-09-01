/**
 * Cor/rótulo/status por nível de halitose. Portado de Design/ onde
 * levelColor/levelLabel/levelBadge existiam (byte-idênticos) em
 * PatientApp.tsx, ProfessionalApp.tsx e AdminApp.tsx.
 *
 * `Nivel` fica aqui por enquanto — quando types/diagnostico.ts existir
 * (fase 1), ele deve virar `DiagnosticoNivel` lá e este arquivo passa a
 * importar de lá em vez de redeclarar.
 */

export type Nivel = 1 | 2 | 3;

export type BadgeStatus = "success" | "warning" | "danger" | "info" | "neutral" | "pending";

export function nivelColor(nivel: Nivel | null): string {
  if (nivel === null) return "#6b7280";
  if (nivel === 1) return "#16a34a";
  if (nivel === 2) return "#ff9500";
  return "#ff3b30";
}

export function nivelLabel(nivel: Nivel | null): string {
  if (nivel === null) return "Pendente";
  if (nivel === 1) return "Hálito Normal";
  if (nivel === 2) return "Halitose Íntima";
  return "Mau Hálito Social";
}

export function nivelBadgeStatus(nivel: Nivel | null): BadgeStatus {
  if (nivel === null) return "pending";
  if (nivel === 1) return "success";
  if (nivel === 2) return "warning";
  return "danger";
}
