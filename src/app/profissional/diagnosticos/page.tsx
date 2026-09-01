"use client";

import { useState } from "react";
import Link from "next/link";
import { Beaker, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { PERIODS, periodLabel, inPeriod, type Period } from "@/lib/date-period";
import { cn } from "@/lib/utils";
import type { StatusDiagnostico } from "@/types/diagnostico";

const PROFISSIONAL_ID_PLACEHOLDER = "profissional-1";

const FILTROS_STATUS: { valor: StatusDiagnostico | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aguardando_revisao", label: "Aguardando revisão" },
  { valor: "concluido", label: "Revisado" },
];

export default function DiagnosticosProfissionalPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const [period, setPeriod] = useState<Period>("Todos");
  const { data: diagnosticos } = useDiagnosticos({ profissionalId: PROFISSIONAL_ID_PLACEHOLDER });

  const filtrados = (diagnosticos ?? [])
    .filter((d) => filtroStatus === "todos" || d.status === filtroStatus)
    .filter((d) => inPeriod(new Date(d.criadoEm).toLocaleDateString("pt-BR"), period, null));

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Diagnósticos</h1>
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroStatus(f.valor)}
              className={cn(
                "font-heading shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                filtroStatus === f.valor
                  ? "bg-white text-[var(--primary)]"
                  : "bg-white/15 text-white/85",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "font-heading border-1.5 shrink-0 rounded-4xl px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white",
                period === p ? "border-white bg-white/20" : "border-white/30",
              )}
            >
              {periodLabel(p, null)}
            </button>
          ))}
        </div>
      </div>

      <div className="shell:cyb-grid flex flex-col gap-2.5 p-4">
        {filtrados.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros para ver mais diagnósticos."
          />
        )}
        {filtrados.map((d) => (
          <Link key={d.id} href={`/profissional/diagnosticos/${d.id}`}>
            <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
              <AvatarWithRole nome={d.pacienteId} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-heading truncate text-sm font-bold">
                  Paciente {d.pacienteId.slice(-1)}
                </div>
                <div className="text-muted-foreground mb-1.5 truncate text-xs">
                  {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                </div>
                <Badge>{d.status}</Badge>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {d.nivel !== null ? (
                  <LevelChip nivel={d.nivel} size="sm" />
                ) : (
                  <Clock className="text-gray-3 h-5 w-5" />
                )}
                {d.confiancaIA && (
                  <span className="text-muted-foreground text-[11px]">IA {d.confiancaIA}%</span>
                )}
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
