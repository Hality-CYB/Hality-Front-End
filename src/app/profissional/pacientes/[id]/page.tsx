"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Camera, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { usePaciente } from "@/hooks/use-pacientes";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { nivelColor } from "@/lib/level-format";

export default function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: paciente } = usePaciente(id);
  const { data: diagnosticos } = useDiagnosticos({ pacienteId: id });

  if (!paciente) return null;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/profissional/pacientes"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Pacientes
        </Link>
        <div className="flex items-center gap-3.5">
          <AvatarWithRole nome={paciente.nome} size={56} />
          <div>
            <div className="font-heading text-lg font-extrabold text-white">{paciente.nome}</div>
            <div className="text-sm text-white/60">{paciente.email}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <Button asChild>
          <Link href={`/profissional/avaliacao?paciente=${paciente.id}`}>
            <Camera className="h-4 w-4" /> Avaliar este paciente
          </Link>
        </Button>

        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <h2 className="mb-3 text-lg">Dados</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span className="font-heading font-semibold">{paciente.telefone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cadastro em</span>
              <span className="font-heading font-semibold">
                {new Date(paciente.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 text-lg">Histórico de diagnósticos</h2>
          <div className="flex flex-col gap-2.5">
            {(diagnosticos ?? []).length === 0 && (
              <EmptyState
                icon={<ScanLine className="h-7 w-7" />}
                title="Nenhum diagnóstico ainda"
              />
            )}
            {diagnosticos?.map((d) => (
              <Link key={d.id} href={`/profissional/diagnosticos/${d.id}`}>
                <Card className="flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${nivelColor(d.nivel)}18` }}
                  >
                    <ScanLine className="h-5 w-5" style={{ color: nivelColor(d.nivel) }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-heading text-sm font-bold">
                      {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                    </div>
                    <Badge className="mt-1">{d.status}</Badge>
                  </div>
                  {d.nivel !== null && <LevelChip nivel={d.nivel} size="sm" />}
                  <ChevronRight className="text-gray-3 h-4 w-4" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
