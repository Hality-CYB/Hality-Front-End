"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Beaker, ScanLine, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuario } from "@/hooks/use-usuarios";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";

export default function UsuarioDiagnosticosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? `/admin/usuarios/${id}`;

  const { data: paciente } = useUsuario(id);
  const { data: diagnosticos } = useDiagnosticos({ pacienteId: id });

  if (!paciente) return null;

  const hrefAtual = `/admin/usuarios/${id}/diagnosticos?voltar=${encodeURIComponent(voltarHref)}`;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {paciente.nome}
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={paciente.nome} size={44} />
          <div>
            <div className="font-heading text-base font-extrabold text-white">Diagnósticos</div>
            <div className="text-xs text-white/60">{diagnosticos?.length ?? 0} exames</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {diagnosticos?.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum diagnóstico"
            description={`${paciente.nome} ainda não fez nenhum diagnóstico.`}
          />
        )}
        <div className="cyb-grid diag-list-card gap-2.5">
          {diagnosticos?.map((d) => (
            <Link
              key={d.id}
              href={`/admin/diagnosticos/${d.id}?voltar=${encodeURIComponent(hrefAtual)}`}
            >
              <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <div className="bg-background text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">
                    Diagnóstico #{d.id.slice(-4)}
                  </div>
                  <div className="text-muted-foreground mb-1.5 truncate text-xs">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </div>
                  <StatusBadge
                    label={statusDiagnosticoLabel(d.status)}
                    status={statusDiagnosticoBadgeStatus(d.status)}
                  />
                </div>
                <div className="flex flex-col items-end gap-1">
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
    </div>
  );
}
