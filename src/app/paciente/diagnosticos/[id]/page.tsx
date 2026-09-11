"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileDown,
  ImageOff,
  AlertTriangle,
  Loader2,
  BadgeCheck,
  ChevronLeft,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { ScoreMeter } from "@/components/score-meter";
import { EmptyState } from "@/components/empty-state";

import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese, useAnamnesePerguntas } from "@/hooks/use-anamnese";
import { nivelColor, type BadgeStatus } from "@/lib/level-format";
import { cn } from "@/lib/utils";

import type { Diagnostico } from "@/types/diagnostico";

// textos de orientação por nível (1, 2 ou 3) - o resumo aparece sempre,
// o completo só quando clica em "ver orientação completa"
const ORIENTACAO: Record<1 | 2 | 3, { resumo: string; completa: string }> = {
  1: {
    resumo: "Seu hálito está dentro do normal. Continue com a rotina de higiene bucal.",
    completa:
      "Seu hálito está dentro do normal. Continue escovando os dentes após as refeições, " +
      "usando fio dental diariamente e mantendo boa hidratação. Consultas de rotina ao " +
      "dentista a cada 6 meses ajudam a manter esse resultado.",
  },
  2: {
    resumo: "Identificamos halitose íntima. Recomendamos limpeza lingual diária.",
    completa:
      "Identificamos halitose íntima (percebida a curta distância). Recomendamos limpeza " +
      "lingual diária com raspador próprio, reforço na hidratação ao longo do dia e uma " +
      "avaliação periodontal para descartar causas gengivais.",
  },
  3: {
    resumo: "Mau hálito social detectado. Avaliação especializada é recomendada.",
    completa:
      "Mau hálito social detectado (perceptível à distância normal de conversa). " +
      "Recomendamos encaminhamento para avaliação odontológica especializada o quanto " +
      "antes, além de reforçar a limpeza lingual e a hidratação enquanto isso.",
  },
};

// monta o texto/cor do badge de status. reparei que "corrigido pelo
// profissional" não é um status separado nos dados, é só um diagnóstico
// concluido que também tem revisadoPor preenchido
function statusExibido(diagnostico: Diagnostico): { label: string; status: BadgeStatus } {
  if (diagnostico.status === "processando") {
    return { label: "Processando", status: "neutral" };
  }
  if (diagnostico.status === "aguardando_revisao") {
    return { label: "Aguardando revisão", status: "warning" };
  }
  if (diagnostico.revisadoPor) {
    return { label: "Corrigido pelo profissional", status: "info" };
  }
  return { label: "Concluído", status: "success" };
}

export default function DiagnosticoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [anamOpen, setAnamOpen] = useState(false);
  const [orientacaoAberta, setOrientacaoAberta] = useState(false);
  const [imagemCarregada, setImagemCarregada] = useState(false);

  const { data: diagnostico, isLoading, isError } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: perguntas } = useAnamnesePerguntas();

  // se der erro (id que não existe ou é de outro paciente) mostra essa
  // tela em vez de quebrar tudo
  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-7 w-7" />}
        title="Não foi possível abrir este diagnóstico"
        description="Ele pode não existir mais, ou pertencer a outro paciente."
        action={
          <Button variant="secondary" asChild>
            <Link href="/paciente/diagnosticos">
              <ChevronLeft className="h-4 w-4" /> Voltar ao histórico
            </Link>
          </Button>
        }
      />
    );
  }

  if (isLoading || !diagnostico) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando diagnóstico...</p>
      </div>
    );
  }

  const nivel = diagnostico.nivel;
  const status = statusExibido(diagnostico);
  const textoPergunta = (perguntaId: string) =>
    perguntas?.find((p) => p.id === perguntaId)?.texto ?? perguntaId;

  return (
    <div className="flex flex-col">
      {/* cabeçalho */}
      <div
        className="flex items-end justify-between p-5"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div>
          <h1 className="mb-0.5 text-xl text-white">
            Diagnóstico #{diagnostico.id.replace(/\D/g, "").slice(-4) || "1"}
          </h1>
          <p className="text-sm text-white/60">
            {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <StatusBadge label={status.label} status={status.status} />
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        {/* aviso quando o diagnóstico foi revisado por um profissional */}
        {diagnostico.revisadoPor && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-teal-100)] bg-[var(--color-teal-50)] p-3 text-[13px]">
            <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--color-teal-800)]" />
            <span className="text-[var(--color-teal-800)]">
              Revisado e corrigido por um profissional
              {diagnostico.revisadoEm &&
                ` em ${new Date(diagnostico.revisadoEm).toLocaleDateString("pt-BR")}`}
              .
            </span>
          </div>
        )}

        {/* score + imagem */}
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            {nivel ? (
              <>
                <div className="relative flex h-25 w-25 items-center justify-center">
                  <ScoreMeter
                    score={diagnostico.confiancaIA ?? 0}
                    color={nivelColor(nivel)}
                    size={100}
                  />
                  <div className="absolute flex flex-col items-center">
                    <span className="font-heading text-xl font-extrabold">
                      {diagnostico.confiancaIA ?? "--"}
                    </span>
                    <span className="text-gray-3 text-[11px]">score</span>
                  </div>
                </div>
                <LevelChip nivel={nivel} size="lg" />
              </>
            ) : (
              <LevelChip nivel={null} size="lg" />
            )}
          </div>

          {/* imagem, com loading enquanto carrega e fallback se não tiver */}
          {diagnostico.imagemUrl ? (
            <div className="border-border bg-background relative aspect-4/3 overflow-hidden rounded-2xl border">
              {!imagemCarregada && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="text-gray-3 h-6 w-6 animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={diagnostico.imagemUrl}
                alt="Imagem capturada para o diagnóstico"
                className={cn(
                  "h-full w-full object-cover transition-opacity",
                  imagemCarregada ? "opacity-100" : "opacity-0",
                )}
                onLoad={() => setImagemCarregada(true)}
                onError={() => setImagemCarregada(true)}
              />
            </div>
          ) : (
            <div className="border-border bg-background flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-2xl border">
              <ImageOff className="text-gray-3 h-8 w-8" />
              <span className="font-heading text-gray-3 text-xs">Sem imagem disponível</span>
            </div>
          )}
        </Card>

        {/* orientação: resumo + botão pra expandir o texto completo */}
        {nivel && (
          <div className="border-secondary rounded-xl border bg-[var(--color-teal-50)] p-3.5">
            <div className="font-heading mb-1.5 text-[13px] font-bold">Orientação</div>
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              {orientacaoAberta ? ORIENTACAO[nivel].completa : ORIENTACAO[nivel].resumo}
            </p>
            <button
              onClick={() => setOrientacaoAberta((o) => !o)}
              className="font-heading text-primary mt-1.5 text-[12px] font-bold underline underline-offset-2"
            >
              {orientacaoAberta ? "Ver menos" : "Ver orientação completa"}
            </button>
          </div>
        )}

        {/* anamnese, abre e fecha ao clicar */}
        <Card className="overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          <button
            onClick={() => setAnamOpen((o) => !o)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <div className="font-heading text-sm font-extrabold">Anamnese</div>
            <ChevronDown
              className={cn("text-gray-3 h-4 w-4 transition-transform", anamOpen && "rotate-180")}
            />
          </button>
          {anamOpen && (
            <div className="flex flex-col gap-1.5 px-5 pb-5">
              {anamnese?.respostas.length ? (
                anamnese.respostas.map((r) => (
                  <div
                    key={r.perguntaId}
                    className="bg-background flex justify-between rounded-[10px] px-3 py-2"
                  >
                    <span className="text-muted-foreground text-[13px]">
                      {textoPergunta(r.perguntaId)}
                    </span>
                    <span className="font-heading text-[13px] font-semibold">{r.valor}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-[13px]">
                  Nenhuma resposta de anamnese encontrada.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* exportar pdf - por enquanto só visual, sem funcionalidade real */}
        <Button variant="outline" className="w-full" disabled>
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>

        <Button variant="secondary" className="w-full" asChild>
          <Link href="/paciente/diagnosticos">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
}
