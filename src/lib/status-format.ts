import type { StatusDiagnostico } from "@/types/diagnostico";
import type { BadgeStatus } from "@/lib/level-format";

/**
 * Cor/rótulo do status de workflow de um diagnóstico (Processando/
 * Aguardando revisão/Revisado) — diferente do nível clínico
 * (level-format.ts). Portado de Design/'s statusBadge, usado nas telas
 * de profissional/admin (que mostram o status em si, não o nível) —
 * byte-idêntico em ProfessionalApp.tsx e AdminApp.tsx.
 */

const STATUS_LABEL: Record<StatusDiagnostico, string> = {
  processando: "Processando",
  aguardando_revisao: "Aguardando revisão",
  concluido: "Revisado",
};

export function statusDiagnosticoLabel(status: StatusDiagnostico): string {
  return STATUS_LABEL[status];
}

export function statusDiagnosticoBadgeStatus(status: StatusDiagnostico): BadgeStatus {
  if (status === "concluido") return "success";
  if (status === "processando") return "neutral";
  return "pending";
}
