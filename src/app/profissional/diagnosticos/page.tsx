"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Beaker, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { useDiagnosticosPaginados } from "@/hooks/use-diagnosticos";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import {
  PERIODS,
  periodLabel,
  periodoParaFiltro,
  type Period,
  type CustomRange,
} from "@/lib/date-period";
import { cn } from "@/lib/utils";
import type { StatusDiagnostico } from "@/types/diagnostico";

const FILTROS_STATUS: { valor: StatusDiagnostico | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aguardando_revisao", label: "Aguardando revisão" },
  { valor: "concluido", label: "Concluído" },
  { valor: "processando", label: "Processando" },
  { valor: "falha", label: "Falha" },
];

export default function DiagnosticosProfissionalPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const [period, setPeriod] = useState<Period>("Todos");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const filtroPeriodo = useMemo(
    () => periodoParaFiltro(period, customRange),
    [period, customRange],
  );
  const lista = useDiagnosticosPaginados({
    ...filtroPeriodo,
    ...(filtroStatus === "todos" ? {} : { status: filtroStatus }),
    limite: 20,
  });
  const itens = lista.data?.pages.flatMap((p) => p.itens) ?? [];

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
                "font-heading shrink-0 rounded-4xl border-[1.5px] px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white",
                period === p ? "border-white bg-white/20" : "border-white/30",
              )}
            >
              {periodLabel(p, null)}
            </button>
          ))}
          <button
            onClick={() => setCustomDialogOpen(true)}
            className={cn(
              "font-heading flex shrink-0 items-center gap-1 rounded-4xl border-[1.5px] px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white",
              period === "custom" ? "border-white bg-white/20" : "border-white/30",
            )}
          >
            <Clock className="h-3 w-3" /> {periodLabel("custom", customRange)}
          </button>
        </div>
      </div>

      <CustomPeriodDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        initial={customRange}
        onApply={(range) => {
          setCustomRange(range);
          setPeriod("custom");
          setCustomDialogOpen(false);
        }}
      />

      <div className="cyb-grid gap-2.5 p-4">
        {!lista.isLoading && itens.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros para ver mais diagnósticos."
          />
        )}
        {itens.map((d) => (
          <Link
            key={d.id}
            href={`/profissional/diagnosticos/${d.id}${d.pacienteId ? `?paciente=${d.pacienteId}` : ""}`}
          >
            <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
              <AvatarWithRole nome={d.pacienteNome ?? "Paciente"} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-heading truncate text-sm font-bold">
                  {d.pacienteNome ?? "Paciente"}
                </div>
                <div className="text-muted-foreground mb-1.5 truncate text-xs">
                  {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                </div>
                <StatusBadge
                  label={statusDiagnosticoLabel(d.status)}
                  status={statusDiagnosticoBadgeStatus(d.status)}
                />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {d.nivel !== null ? (
                  <LevelChip nivel={d.nivel} size="sm" />
                ) : (
                  <Clock className="text-gray-3 h-5 w-5" />
                )}
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>
        ))}
      </div>

      {lista.hasNextPage && (
        <div className="flex justify-center px-4 pb-4">
          <Button
            variant="secondary"
            onClick={() => lista.fetchNextPage()}
            disabled={lista.isFetchingNextPage}
          >
            {lista.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}
