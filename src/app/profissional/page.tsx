"use client";

import Link from "next/link";
import { Clock, CalendarDays, Users, Beaker, Camera, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { useResumoProfissional } from "@/hooks/use-profissional";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import type { DiagnosticoResumo } from "@/types/diagnostico";

function hrefRevisao(d: DiagnosticoResumo) {
  const paciente = d.pacienteId ? `&paciente=${d.pacienteId}` : "";
  return `/profissional/diagnosticos/${d.id}?voltar=/profissional${paciente}`;
}

export default function ProfissionalHomePage() {
  const { nome } = useSessaoAtual();
  const { data: resumo } = useResumoProfissional();
  const { data: pendentes } = useDiagnosticos({ status: "aguardando_revisao", limite: 2 });
  const { data: recentes } = useDiagnosticos({ limite: 4 });

  const ultimo = resumo?.ultimoDiagnosticoEm
    ? new Date(resumo.ultimoDiagnosticoEm).toLocaleDateString("pt-BR")
    : "—";
  const stats = [
    { valor: resumo?.pendentesRevisao ?? 0, label: "para revisar", Icon: Clock },
    { valor: resumo?.diagnosticosTotal ?? 0, label: "diagnósticos", Icon: Beaker },
    { valor: resumo?.pacientesAtivos ?? 0, label: "pacientes", Icon: Users },
    { valor: ultimo, label: "último diagnóstico", Icon: CalendarDays },
  ];
  const itensRecentes = recentes?.itens ?? [];

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden p-5 pb-7"
        style={{ background: "linear-gradient(160deg, #0a3d4a 0%, #0b6b82 55%, #0d8aa6 100%)" }}
      >
        <p className="mb-0.5 text-[13px] text-white/55">Olá,</p>
        <h1 className="mb-5 text-2xl text-white">{nome}</h1>
        <div className="mb-1.5 grid grid-cols-2 gap-2.5">
          {stats.map(({ valor, label, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-white/14 bg-white/12 p-3.5"
            >
              <Icon className="h-4.5 w-4.5 text-white/80" />
              <div>
                <div className="font-heading text-xl leading-none font-black text-white">
                  {valor}
                </div>
                <div className="mt-0.5 text-[10px] text-white/50">{label}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mb-4.5 text-[11px] text-white/50">Números dos últimos 30 dias</p>
        <Link
          href="/profissional/avaliacao"
          className="relative flex items-center gap-3.5 overflow-hidden rounded-[18px] p-4.5"
          style={{
            background: "linear-gradient(175deg, #44bfad 8%, #094c5e 82%)",
            boxShadow: "0px 6px 24px 0px rgba(22,163,74,0.35)",
          }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/20">
            <Camera className="h-5.5 w-5.5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-heading text-base font-extrabold text-white">Avaliar paciente</div>
            <div className="mt-0.5 text-xs text-white/70">Anamnese + captura de imagem</div>
          </div>
          <ChevronRight className="h-4.5 w-4.5 text-white/80" />
        </Link>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        {pendentes && pendentes.total > 0 && (
          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg">Aguardando revisão</h2>
                <p className="text-muted-foreground text-xs">{pendentes.total} diagnósticos</p>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/profissional/diagnosticos">Ver todos</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {pendentes.itens.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-[#FCD34D] bg-[#FEF3C7] p-3.5"
                >
                  <AvatarWithRole nome={d.pacienteNome ?? "Paciente"} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="font-heading truncate text-sm font-bold">
                      {d.pacienteNome ?? "Paciente"}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {d.nivel !== null && <LevelChip nivel={d.nivel} size="sm" />}
                  <Button size="sm" asChild>
                    <Link href={hrefRevisao(d)}>Revisar</Link>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Últimos diagnósticos</h2>
            <Link
              href="/profissional/diagnosticos"
              className="font-heading text-primary text-[13px] font-bold"
            >
              Ver todos
            </Link>
          </div>
          {itensRecentes.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhum diagnóstico dos seus pacientes ainda.
            </p>
          )}
          <div className="flex flex-col">
            {itensRecentes.map((d, i) => (
              <Link
                key={d.id}
                href={hrefRevisao(d)}
                className={`flex items-center gap-3 py-3 ${i < itensRecentes.length - 1 ? "border-border border-b" : ""}`}
              >
                <AvatarWithRole nome={d.pacienteNome ?? "Paciente"} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-[13px] font-bold">
                    {d.pacienteNome ?? "Paciente"}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {d.nivel !== null && <LevelChip nivel={d.nivel} size="sm" />}
                  <StatusBadge
                    label={statusDiagnosticoLabel(d.status)}
                    status={statusDiagnosticoBadgeStatus(d.status)}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
