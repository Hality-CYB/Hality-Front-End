import type { StatusDiagnostico } from "@/types/diagnostico";
import type { BadgeStatus } from "@/lib/level-format";

/**
 * Cor/rótulo do status de workflow de um diagnóstico — diferente do nível
 * clínico (level-format.ts). No back, "concluido" é o fim da análise da IA;
 * ter sido revisado por um profissional é outra informação (`revisao`).
 */

const STATUS_LABEL: Record<StatusDiagnostico, string> = {
  processando: "Processando",
  aguardando_revisao: "Aguardando revisão",
  concluido: "Concluído",
  falha: "Falha na análise",
};

export function statusDiagnosticoLabel(status: StatusDiagnostico): string {
  return STATUS_LABEL[status];
}

export function statusDiagnosticoBadgeStatus(status: StatusDiagnostico): BadgeStatus {
  if (status === "concluido") return "success";
  if (status === "processando") return "neutral";
  if (status === "falha") return "danger";
  return "pending";
}
