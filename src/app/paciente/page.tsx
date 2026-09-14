"use client";

import Link from "next/link";
import { Camera, ChevronRight, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { TipCard } from "@/components/tip-card";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { useDicas } from "@/hooks/use-dicas";
import { nivelColor } from "@/lib/level-format";
import { useSessaoAtual } from "@/lib/auth/session-context";

export default function PacienteHomePage() {
  const { id: pacienteId, nome } = useSessaoAtual();
  const { data: diagnosticos } = useDiagnosticos({ pacienteId });
  const { data: dicas } = useDicas({ publicado: true });

  const ultimo = diagnosticos?.find((d) => d.nivel !== null);
  const dicasHome = (dicas ?? []).filter((d) => d.mostrarNaHome).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden p-5 pb-5"
        style={{ background: "linear-gradient(167deg, #0a3d4a 8%, #0b6b82 54%, #0d8aa6 92%)" }}
      >
        <div className="relative mb-5">
          <p className="mb-0.5 text-[13px] text-white/55">Olá,</p>
          <h1 className="text-2xl text-white">{nome.split(" ").slice(0, 2).join(" ")}</h1>
        </div>

        <Link
          href="/paciente/avaliacao"
          className="relative flex items-center gap-3.5 overflow-hidden rounded-[18px] p-4.5"
          style={{
            background: "linear-gradient(175deg, #44bfad 8%, #094c5e 82%)",
            boxShadow: "0px 6px 24px 0px rgba(22,163,74,0.35)",
          }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/20">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-heading text-base font-extrabold text-white">
              Fazer novo diagnóstico
            </div>
            <div className="mt-0.5 text-xs text-white/70">Capture e analise com IA · ~2 min</div>
          </div>
        </Link>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Último Diagnóstico</h2>
            <Link
              href="/paciente/diagnosticos"
              className="font-heading text-primary flex items-center gap-1 text-[13px] font-bold"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {ultimo ? (
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md"
                style={{ background: `${nivelColor(ultimo.nivel)}18` }}
              >
                <ScanLine className="h-6.5 w-6.5" style={{ color: nivelColor(ultimo.nivel) }} />
              </div>
              <div className="flex-1">
                <LevelChip nivel={ultimo.nivel} />
                <div className="text-muted-foreground mt-1.5 mb-2.5 text-xs">
                  {new Date(ultimo.criadoEm).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/paciente/diagnosticos/${ultimo.id}`}>Ver detalhes</Link>
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={<ScanLine className="h-7 w-7" />}
              title="Nenhum diagnóstico ainda"
              description="Faça seu primeiro diagnóstico agora!"
            />
          )}
        </Card>

        <div>
          <h3 className="mb-3 text-[17px]">Dicas para você</h3>
          <div className="cyb-grid gap-2.5">
            {dicasHome.map((dica) => (
              <TipCard
                key={dica.id}
                titulo={dica.titulo}
                categoria={dica.categoria}
                corpo={dica.corpo}
                formato={dica.formato}
                midiaUrl={dica.midiaUrl}
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
