"use client";

import { useState } from "react";
import Link from "next/link";
import { ScanLine, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { nivelColor, nivelLabel, nivelBadgeStatus } from "@/lib/level-format";
import { PERIODS, periodLabel, inPeriod, type Period, type CustomRange } from "@/lib/date-period";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  processando: "Aguardando análise",
  aguardando_revisao: "Aguardando revisão",
};

export default function DiagnosticosPage() {
  const { id: pacienteId } = useSessaoAtual();
  const [period, setPeriod] = useState<Period>("Todos");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const { data: diagnosticos } = useDiagnosticos({ pacienteId });

  const items = diagnosticos ?? [];
  const filtrados = items.filter((d) =>
    inPeriod(new Date(d.criadoEm).toLocaleDateString("pt-BR"), period, customRange),
  );

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-0.5 text-xl text-white">Meus Diagnósticos</h1>
        <p className="text-sm text-white/60">{items.length} exames realizados</p>
      </div>

      {items.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "font-heading border-1.5 shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                period === p
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted-foreground bg-card",
              )}
            >
              {periodLabel(p, null)}
            </button>
          ))}
          <button
            onClick={() => setCustomDialogOpen(true)}
            className={cn(
              "font-heading border-1.5 flex shrink-0 items-center gap-1.5 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
              period === "custom"
                ? "border-primary bg-primary text-white"
                : "border-border text-muted-foreground bg-card",
            )}
          >
            <Clock className="h-3.5 w-3.5" /> {periodLabel("custom", customRange)}
          </button>
        </div>
      )}

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
        {items.length === 0 && (
          <EmptyState
            icon={<ScanLine className="h-7 w-7" />}
            title="Nenhum diagnóstico"
            description="Faça seu primeiro diagnóstico agora."
          />
        )}
        {items.length > 0 && filtrados.length === 0 && (
          <EmptyState
            icon={<Clock className="h-7 w-7" />}
            title="Nenhum diagnóstico neste período"
            description="Tente selecionar um período maior."
          />
        )}
        {filtrados.map((d) => (
          <Link key={d.id} href={`/paciente/diagnosticos/${d.id}`}>
            <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: `${nivelColor(d.nivel)}18` }}
              >
                <ScanLine className="h-5.5 w-5.5" style={{ color: nivelColor(d.nivel) }} />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">Diagnóstico #{d.id.slice(-4)}</div>
                <div className="text-muted-foreground text-xs">
                  {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <StatusBadge
                label={
                  d.status === "concluido"
                    ? nivelLabel(d.nivel)
                    : (STATUS_LABEL[d.status] ?? d.status)
                }
                status={nivelBadgeStatus(d.nivel)}
              />
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
