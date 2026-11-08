import { createElement } from "react";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { nivelColor, nivelIcon } from "@/lib/level-format";
import { statusDiagnosticoBadgeStatus, statusDiagnosticoLabel } from "@/lib/status-format";
import type { DiagnosticoAdminResumo } from "@/types/admin";
import { formatarData } from "@/lib/datas";

type DiagnosticoAdminCardProps = {
  diagnostico: DiagnosticoAdminResumo;
  href: string;
  /** Padrão: o nome do paciente. Na lista de um paciente só, o número do diagnóstico. */
  titulo?: string;
  selecionando?: boolean;
  selecionado?: boolean;
  selecaoDesabilitada?: boolean;
  onAlternarSelecao?: () => void;
};

/**
 * Linha de diagnóstico nas telas do admin. Mostra o nível que vale (revisado
 * prevalece sobre a IA): sem revisão, o chip leva "IA"; com revisão que mudou
 * o resultado, "Ajustado".
 */
export function DiagnosticoAdminCard({
  diagnostico: d,
  href,
  titulo,
  selecionando = false,
  selecionado = false,
  selecaoDesabilitada = false,
  onAlternarSelecao,
}: DiagnosticoAdminCardProps) {
  const rotuloNivel = !d.revisao.revisado ? "IA" : d.nivelCorrigido ? "Ajustado" : null;

  return (
    <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
      {selecionando && (
        <label className="flex shrink-0 items-center" title={`Selecionar ${d.pacienteNome}`}>
          <input
            type="checkbox"
            checked={selecionado}
            disabled={selecaoDesabilitada}
            onChange={onAlternarSelecao}
            aria-label={`Selecionar diagnóstico de ${d.pacienteNome}, ${d.id}`}
            className="h-4 w-4 accent-[var(--primary)]"
          />
        </label>
      )}
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${nivelColor(d.nivel)}18` }}
        >
          {createElement(nivelIcon(d.nivel), {
            className: "h-5 w-5",
            style: { color: nivelColor(d.nivel) },
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading truncate text-sm font-bold">{titulo ?? d.pacienteNome}</div>
          <div className="text-muted-foreground mb-1.5 truncate text-xs">
            {formatarData(d.criadoEm)}
            {titulo === undefined && ` · #${d.id}`}
          </div>
          <StatusBadge
            label={statusDiagnosticoLabel(d.status)}
            status={statusDiagnosticoBadgeStatus(d.status)}
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          {d.nivel !== null ? (
            <>
              <LevelChip nivel={d.nivel} size="sm" />
              {rotuloNivel && (
                <span className="text-muted-foreground text-[11px]">{rotuloNivel}</span>
              )}
            </>
          ) : (
            <Clock className="text-gray-3 h-5 w-5" aria-label="Sem classificação" />
          )}
        </div>
        <ChevronRight className="text-gray-3 h-4 w-4" />
      </Link>
    </Card>
  );
}
