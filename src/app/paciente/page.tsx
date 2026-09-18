"use client";

import Link from "next/link";
import { Bell, Camera, ChevronRight, Gauge, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, STATUS_COLORS } from "@/components/status-badge";
import { TipCard } from "@/components/tip-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ScoreMeter } from "@/components/score-meter";
import { useHome } from "@/hooks/use-home";
import { useMediaQuery } from "@/hooks/use-media-query";
import { classificacaoStatus, ESCALA_SABURRA_MAX } from "@/types/home";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { DESKTOP_QUERY } from "@/components/layout/app-shell";

const CASCADE_STAGGER_MS = 45;
const CASCADE_DURATION_MS = 125;
const CASCADE_DISTANCE_PX = 10;
const STAT_CARDS_START_INDEX = 0;
const DIAGNOSTICO_INDEX = 3;
const AVISOS_INDEX = 4;
const DICAS_TITLE_INDEX = 5;
const DICAS_CARDS_START_INDEX = 6;

const SCORE_METER_DELAY_MS = DIAGNOSTICO_INDEX * CASCADE_STAGGER_MS + CASCADE_DURATION_MS;

export default function PacienteHomePage() {
  const { nome } = useSessaoAtual();
  const { data: home, isError, refetch } = useHome();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const nomeSaudacao = nome || home?.usuarioNome || "";
  const ultimoDiagnostico = home?.ultimoDiagnostico;

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden p-5 pb-5"
        style={{ background: "linear-gradient(167deg, #0a3d4a 8%, #0b6b82 54%, #0d8aa6 92%)" }}
      >
        <div className="relative mb-5">
          <p className="mb-0.5 text-[13px] text-white/55">Olá,</p>
          <h1 className="text-2xl text-white">{nomeSaudacao.split(" ").slice(0, 2).join(" ")}</h1>
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
        {isError ? (
          <Card className="items-center gap-3 rounded-lg p-5 text-center shadow-sm ring-0">
            <p className="text-muted-foreground text-sm">Não foi possível carregar sua Home.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </Card>
        ) : !home ? (
          <Card className="items-center gap-2 rounded-lg p-5 text-center shadow-sm ring-0">
            <p className="text-muted-foreground text-sm">Carregando…</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <ScrollReveal
                delay={(STAT_CARDS_START_INDEX + 0) * CASCADE_STAGGER_MS}
                duration={CASCADE_DURATION_MS}
                distance={CASCADE_DISTANCE_PX}
                axis={isDesktop ? "x" : "y"}
              >
                <StatCard
                  label="Diagnósticos"
                  value={home.totalDiagnosticos}
                  icon={<ScanLine className="h-3.5 w-3.5" />}
                />
              </ScrollReveal>
              <ScrollReveal
                delay={(STAT_CARDS_START_INDEX + 1) * CASCADE_STAGGER_MS}
                duration={CASCADE_DURATION_MS}
                distance={CASCADE_DISTANCE_PX}
                axis={isDesktop ? "x" : "y"}
              >
                <StatCard
                  label="Último score"
                  value={ultimoDiagnostico?.escalaSaburra ?? "--"}
                  icon={<Gauge className="h-3.5 w-3.5" />}
                />
              </ScrollReveal>
              <ScrollReveal
                delay={(STAT_CARDS_START_INDEX + 2) * CASCADE_STAGGER_MS}
                duration={CASCADE_DURATION_MS}
                distance={CASCADE_DISTANCE_PX}
                axis={isDesktop ? "x" : "y"}
              >
                <StatCard
                  label="Avisos"
                  value={home.avisosNaoLidos}
                  icon={<Bell className="h-3.5 w-3.5" />}
                />
              </ScrollReveal>
            </div>

            <ScrollReveal
              delay={DIAGNOSTICO_INDEX * CASCADE_STAGGER_MS}
              duration={CASCADE_DURATION_MS}
              distance={CASCADE_DISTANCE_PX}
              axis={isDesktop ? "x" : "y"}
            >
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
                <div className="min-h-18">
                  {ultimoDiagnostico ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <ScoreMeter
                        score={ultimoDiagnostico.escalaSaburra}
                        max={ESCALA_SABURRA_MAX}
                        color={
                          STATUS_COLORS[
                            classificacaoStatus(ultimoDiagnostico.classificacaoCodigo ?? "")
                          ].color
                        }
                        label={ultimoDiagnostico.classificacaoLabel ?? undefined}
                        delay={SCORE_METER_DELAY_MS}
                      />
                      <div className="flex-1">
                        {ultimoDiagnostico.escalaSaburra === null ||
                        ultimoDiagnostico.classificacaoLabel === null ? (
                          <StatusBadge label="Processando" status="pending" />
                        ) : (
                          <StatusBadge
                            label={ultimoDiagnostico.classificacaoLabel}
                            status={classificacaoStatus(
                              ultimoDiagnostico.classificacaoCodigo ?? "",
                            )}
                          />
                        )}
                        <div className="text-muted-foreground mt-1.5 mb-2.5 text-xs">
                          {new Date(ultimoDiagnostico.dataDiagnostico).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/paciente/diagnosticos/${ultimoDiagnostico.id}`}>
                          Ver detalhes
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <EmptyState
                      compact
                      icon={<ScanLine className="h-4 w-4" />}
                      title="Nenhum diagnóstico ainda"
                      description="Faça seu primeiro diagnóstico agora!"
                      action={
                        <Button asChild>
                          <Link href="/paciente/avaliacao">Fazer novo diagnóstico</Link>
                        </Button>
                      }
                    />
                  )}
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal
              delay={AVISOS_INDEX * CASCADE_STAGGER_MS}
              duration={CASCADE_DURATION_MS}
              distance={CASCADE_DISTANCE_PX}
              axis={isDesktop ? "x" : "y"}
            >
              <Card className="relative rounded-lg p-0 opacity-60 shadow-sm ring-0">
                <div className="flex items-center gap-3 p-4">
                  <div className="bg-background text-gray-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading text-sm font-bold">Avisos</div>
                    <div className="text-muted-foreground text-xs">Em breve</div>
                  </div>
                </div>
                {home.avisosNaoLidos > 0 && (
                  <StatusBadge
                    label={String(home.avisosNaoLidos)}
                    status="danger"
                    className="absolute top-2 right-2"
                  />
                )}
              </Card>
            </ScrollReveal>

            {home.dicas.length > 0 && (
              <div id="dicas">
                <ScrollReveal
                  delay={DICAS_TITLE_INDEX * CASCADE_STAGGER_MS}
                  duration={CASCADE_DURATION_MS}
                  distance={CASCADE_DISTANCE_PX}
                  axis={isDesktop ? "x" : "y"}
                >
                  <h3 className="mb-3 text-[17px]">Dicas para você</h3>
                </ScrollReveal>
                <div className="cyb-grid gap-2.5">
                  {home.dicas.map((dica, index) => (
                    <ScrollReveal
                      key={dica.id}
                      delay={(DICAS_CARDS_START_INDEX + index) * CASCADE_STAGGER_MS}
                      duration={CASCADE_DURATION_MS}
                      distance={CASCADE_DISTANCE_PX}
                      axis={isDesktop ? "x" : "y"}
                    >
                      <TipCard titulo={dica.titulo} corpo={dica.conteudo} formato="texto" compact />
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
