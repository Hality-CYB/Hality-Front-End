"use client";

import { useState } from "react";
import Link from "next/link";
import { ScanLine, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { PERIODS, periodLabel, inPeriod, type Period } from "@/lib/date-period";
import { cn } from "@/lib/utils";

// TODO: trocar pelo id do paciente logado (ver TODO em avaliacao/page.tsx)
const PACIENTE_ID_PLACEHOLDER = "paciente-1";

export default function DiagnosticosPage() {
  const [period, setPeriod] = useState<Period>("Todos");
  const { data: diagnosticos } = useDiagnosticos({ pacienteId: PACIENTE_ID_PLACEHOLDER });

  const items = diagnosticos ?? [];
  const filtrados = items.filter((d) =>
    inPeriod(new Date(d.criadoEm).toLocaleDateString("pt-BR"), period, null),
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
        </div>
      )}

      <div className="shell:cyb-grid flex flex-col gap-2.5 p-4">
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
            <Card className="flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
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
              <Badge>{d.status === "concluido" ? nivelLabel(d.nivel) : d.status}</Badge>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
