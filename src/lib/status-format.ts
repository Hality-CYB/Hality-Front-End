import type { StatusDiagnostico } from "@/types/diagnostico";
import type { BadgeStatus } from "@/lib/level-format";

/**
 * Cor/rótulo do status de workflow de um diagnóstico — diferente do nível
 * clínico (level-format.ts). A IA termina em "aguardando_revisao"; o
 * diagnóstico só fica "concluido" depois da revisão de um profissional.
 */

const STATUS_LABEL: Record<StatusDiagnostico, string> = {
  processando: "Processando",
  aguardando_revisao: "Aguardando revisão",
  concluido: "Revisado",
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
