"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ScanLine, Image as ImageIcon, ChevronRight, Lightbulb, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { LevelChip } from "@/components/level-chip";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese, useAnamnesePerguntas } from "@/hooks/use-anamnese";
import { useDicas } from "@/hooks/use-dicas";
import { nivelColor, nivelLabel, nivelBadgeStatus } from "@/lib/level-format";
import { cn } from "@/lib/utils";

const ORIENTACAO_POR_NIVEL: Record<1 | 2 | 3, string> = {
  1: "Seu hálito está normal. Mantenha a rotina de higiene bucal e hidratação adequada.",
  2: "Identificamos halitose íntima. Recomendamos limpeza lingual diária e avaliação periodontal.",
  3: "Mau hálito social detectado. Encaminhamento para avaliação especializada recomendado.",
};

const STATUS_LABEL: Record<string, string> = {
  processando: "Aguardando análise",
  aguardando_revisao: "Aguardando revisão",
};

export default function DiagnosticoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detailTab, setDetailTab] = useState<"detalhes" | "orientacoes">("detalhes");
  const [anamOpen, setAnamOpen] = useState(false);

  const { data: diagnostico } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: perguntas } = useAnamnesePerguntas();
  const { data: dicas } = useDicas({ publicado: true });

  if (!diagnostico) return null;

  const nivel = diagnostico.nivel;
  const orientacoes = (dicas ?? []).filter((d) => nivel && d.niveis.includes(nivel));
  const textoPergunta = (perguntaId: string) =>
    perguntas?.find((p) => p.id === perguntaId)?.texto ?? perguntaId;

  return (
    <div className="flex flex-col">
      <div
        className="relative flex items-end justify-between p-5"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div>
          <h1 className="mb-0.5 text-xl text-white">Diagnóstico #{diagnostico.id.slice(-4)}</h1>
          <p className="text-sm text-white/60">
            {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <StatusBadge
          label={
            diagnostico.status === "concluido"
              ? nivelLabel(nivel)
              : (STATUS_LABEL[diagnostico.status] ?? diagnostico.status)
          }
          status={nivelBadgeStatus(nivel)}
        />
      </div>

      <div className="p-4">
        <div className="bg-background flex gap-0.5 rounded-xl p-1">
          {(["detalhes", "orientacoes"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setDetailTab(v)}
              className={cn(
                "font-heading flex-1 rounded-[9px] px-1.5 py-2.25 text-[13px] font-bold transition-all",
                detailTab === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "detalhes" ? "Detalhes" : "Orientações"}
            </button>
          ))}
        </div>

        {detailTab === "detalhes" && (
          <div className="shell:flex-row shell:items-stretch mt-3.5 flex flex-col gap-3.5">
            <Card className="shell:flex-1 rounded-lg p-5 shadow-sm ring-0">
              <div className="mb-4 text-center">
                <div
                  className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-[22px]"
                  style={{ background: `${nivelColor(nivel)}18` }}
                >
                  <ScanLine className="h-9 w-9" style={{ color: nivelColor(nivel) }} />
                </div>
                <LevelChip nivel={nivel} size="lg" />
              </div>
              <div className="border-border bg-background flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-2xl border">
                <ImageIcon className="text-gray-3 h-8 w-8" />
                <span className="font-heading text-gray-3 text-xs">Imagem capturada</span>
              </div>
            </Card>

            <div className="shell:flex-1 shell:min-h-0 flex flex-col gap-3.5">
              {nivel && (
                <div className="border-secondary rounded-xl border bg-[var(--color-teal-50)] p-3.5">
                  <div className="font-heading mb-1.5 text-[13px] font-bold">Orientação</div>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    {ORIENTACAO_POR_NIVEL[nivel]}
                  </p>
                </div>
              )}

              <Card className="shell:flex-1 shell:flex shell:flex-col overflow-hidden rounded-lg p-0 shadow-sm ring-0">
                <button
                  onClick={() => setAnamOpen((o) => !o)}
                  className="shell:pointer-events-none flex w-full shrink-0 items-center justify-between p-5 text-left"
                >
                  <div className="font-heading text-sm font-extrabold">Anamnese</div>
                  <ChevronRight
                    className={cn(
                      "text-gray-3 shell:rotate-90 h-4 w-4 transition-transform",
                      anamOpen && "rotate-90",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "shell:flex shell:min-h-0 shell:flex-1 shell:overflow-y-auto flex-col gap-1.5 px-5 pb-5",
                    anamOpen ? "flex" : "hidden",
                  )}
                >
                  {anamnese?.respostas.map((r) => (
                    <div
                      key={r.perguntaId}
                      className="bg-background flex justify-between rounded-[10px] px-3 py-2"
                    >
                      <span className="text-muted-foreground text-[13px]">
                        {textoPergunta(r.perguntaId)}
                      </span>
                      <span className="font-heading text-[13px] font-semibold">{r.valor}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {detailTab === "orientacoes" && (
          <div className="cyb-grid mt-3.5 gap-3.5">
            {!nivel && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Ainda sem orientações"
                description="As orientações aparecem depois que o diagnóstico for concluído."
              />
            )}
            {nivel && orientacoes.length === 0 && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Nenhuma orientação cadastrada"
                description="Ainda não há dicas para essa classificação."
              />
            )}
            {orientacoes.map((dica) => (
              <TipCard
                key={dica.id}
                titulo={dica.titulo}
                categoria={dica.categoria}
                corpo={dica.corpo}
                formato={dica.formato}
                midiaUrl={dica.midiaUrl}
              />
            ))}
          </div>
        )}

        <Button variant="secondary" className="mt-3.5 w-full" asChild>
          <Link href="/paciente/diagnosticos">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
}
