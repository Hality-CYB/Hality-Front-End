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
import { cn } from "@/lib/utils";
import type { StatusDiagnostico } from "@/types/diagnostico";

const FILTROS_STATUS: { valor: StatusDiagnostico | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aguardando_revisao", label: "Aguardando revisão" },
  { valor: "concluido", label: "Revisado" },
];

export default function ValidacaoPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const { data: diagnosticos } = useDiagnosticos();

  const filtrados = (diagnosticos ?? []).filter(
    (d) => filtroStatus === "todos" || d.status === filtroStatus,
  );

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Validação de Diagnósticos</h1>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
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
      </div>

      <div className="shell:cyb-grid diag-list-card flex flex-col gap-2.5 p-4">
        {filtrados.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros."
          />
        )}
        {filtrados.map((d) => (
          <Link key={d.id} href={`/admin/validacao/${d.id}`}>
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
              {d.nivel !== null ? (
                <LevelChip nivel={d.nivel} size="sm" />
              ) : (
                <Clock className="text-gray-3 h-5 w-5" />
              )}
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
