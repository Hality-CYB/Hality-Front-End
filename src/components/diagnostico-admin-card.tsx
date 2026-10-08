import { createElement } from "react";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { nivelColor, nivelIcon } from "@/lib/level-format";
import { statusDiagnosticoBadgeStatus, statusDiagnosticoLabel } from "@/lib/status-format";
import type { DiagnosticoAdminResumo } from "@/types/admin";

type DiagnosticoAdminCardProps = {
  diagnostico: DiagnosticoAdminResumo;
  titulo: string;
  href: string;
};

/**
 * Linha de diagnóstico nas telas do admin. O nível é o da IA: o back do admin
 * ainda não devolve o nível revisado (ver TODO em types/admin.ts), por isso
 * o chip leva o rótulo "IA".
 */
export function DiagnosticoAdminCard({ diagnostico: d, titulo, href }: DiagnosticoAdminCardProps) {
  return (
    <Link href={href}>
      <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
        {/* Ícone e cor pelo resultado, como na lista do paciente. */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${nivelColor(d.nivelIA)}18` }}
        >
          {createElement(nivelIcon(d.nivelIA), {
            className: "h-5 w-5",
            style: { color: nivelColor(d.nivelIA) },
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading truncate text-sm font-bold">{titulo}</div>
          <div className="text-muted-foreground mb-1.5 truncate text-xs">
            {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
          </div>
          <StatusBadge
            label={statusDiagnosticoLabel(d.status)}
            status={statusDiagnosticoBadgeStatus(d.status)}
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          {d.nivelIA !== null ? (
            <>
              <LevelChip nivel={d.nivelIA} size="sm" />
              <span className="text-muted-foreground text-[11px]">IA</span>
            </>
          ) : (
            <Clock className="text-gray-3 h-5 w-5" aria-label="Sem classificação" />
          )}
        </div>
        <ChevronRight className="text-gray-3 h-4 w-4" />
      </Card>
    </Link>
  );
}
