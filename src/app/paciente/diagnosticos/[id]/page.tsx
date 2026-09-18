"use client";

import { use, useState, createElement } from "react";
import {
  Image as ImageIcon,
  ChevronRight,
  Lightbulb,
  TriangleAlert,
  BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese, useAnamnesePerguntas } from "@/hooks/use-anamnese";
import { nivelColor, nivelLabel, nivelBadgeStatus, nivelIcon } from "@/lib/level-format";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { TipoPergunta } from "@/types/anamnese";

const STATUS_LABEL: Record<string, string> = {
  processando: "Aguardando análise",
  aguardando_revisao: "Aguardando revisão",
  falha: "Falha na análise",
};

const ABAS = [
  { valor: "detalhes", label: "Detalhes" },
  { valor: "orientacoes", label: "Orientações" },
] as const;

function formatarResposta(tipo: TipoPergunta, valor: string): string {
  if (tipo === "sim_nao") {
    if (valor === "true") return "Sim";
    if (valor === "false") return "Não";
  }
  return valor;
}

export default function DiagnosticoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detailTab, setDetailTab] = useState<"detalhes" | "orientacoes">("detalhes");
  const [anamOpen, setAnamOpen] = useState(false);

  const { data: diagnostico } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: perguntas } = useAnamnesePerguntas();

  if (!diagnostico) return null;

  const nivel = diagnostico.nivel;
  const conteudos = diagnostico.conteudos ?? [];
  const fotoUrl = diagnostico.imagemUrl ? `${config.apiBaseUrl}${diagnostico.imagemUrl}` : null;
  const iconeNivel = nivelIcon(nivel);
  const textoPergunta = (perguntaId: string) =>
    perguntas?.perguntas.find((p) => p.id === perguntaId)?.texto ?? perguntaId;

  return (
    <div className="flex flex-col">
      <div className="relative p-5 pb-4" style={{ background: "var(--gradient-brand)" }}>
        <div className="mb-4 flex items-end justify-between">
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

        <div className="flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
          {ABAS.map(({ valor, label }) => (
            <button
              key={valor}
              onClick={() => setDetailTab(valor)}
              className={cn(
                "font-heading flex-1 rounded-[9px] px-1.5 py-2.25 text-[13px] font-bold transition-all",
                detailTab === valor
                  ? "text-primary bg-white shadow-md"
                  : "text-white/65 hover:text-white/90",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {detailTab === "detalhes" && (
          <div className="flex flex-col gap-3.5">
            <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
              <div className="shell:flex-row flex flex-col gap-4 p-5">
                <div className="shell:w-1/2 flex w-full flex-col items-center justify-center gap-3.5">
                  <div className="flex flex-col items-center gap-2.5">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-[22px]"
                      style={{ background: `${nivelColor(nivel)}18` }}
                    >
                      {createElement(iconeNivel, {
                        className: "h-9 w-9",
                        style: { color: nivelColor(nivel) },
                      })}
                    </div>
                    <LevelChip nivel={nivel} size="lg" />
                  </div>

                  {nivel &&
                    (diagnostico.revisao?.revisado ? (
                      <div className="border-secondary bg-secondary/40 w-full rounded-xl border p-3.5">
                        <div className="font-heading text-primary mb-1 flex items-center gap-1.5 text-[13px] font-bold">
                          <BadgeCheck className="h-4 w-4" /> Revisado por profissional
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {diagnostico.revisao.profissionalNome ?? "Profissional Hality"}
                          {diagnostico.revisao.revisadoEm &&
                            ` · ${new Date(diagnostico.revisao.revisadoEm).toLocaleDateString("pt-BR")}`}
                        </p>
                        {diagnostico.revisao.observacoes && (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {diagnostico.revisao.observacoes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-start gap-2 rounded-xl border border-[#FFC107] bg-[#FFF3CD] p-3.5 text-center">
                        <TriangleAlert className="h-8 w-8 shrink-0 self-center text-[#92400E]" />
                        <p className="text-xs leading-relaxed text-[#92400E]">
                          Pré-diagnóstico gerado por IA, ainda não revisado por um profissional. Não
                          substitui avaliação clínica.
                        </p>
                      </div>
                    ))}
                </div>
                <div className="border-border bg-background shell:w-1/2 relative flex aspect-4/3 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border">
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo back por path dinâmico, fora do domínio de otimização do next/image
                    <img
                      src={fotoUrl}
                      alt="Foto da língua capturada"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="text-gray-3 h-7 w-7" />
                      <span className="font-heading text-gray-3 text-xs">Imagem capturada</span>
                    </>
                  )}
                </div>
              </div>

              {nivel && conteudos[0] && (
                <div className="bg-[var(--color-teal-50)] p-5">
                  <div className="font-heading mb-1.5 text-[13px] font-bold">Análise</div>
                  {conteudos[0].textos.map((texto, i) => (
                    <p key={i} className="text-muted-foreground text-[13px] leading-relaxed">
                      {texto}
                    </p>
                  ))}
                </div>
              )}
            </Card>

            <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
              <button
                onClick={() => setAnamOpen((o) => !o)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="font-heading text-sm font-extrabold">Anamnese</div>
                <ChevronRight
                  className={cn(
                    "text-gray-3 h-4 w-4 transition-transform",
                    anamOpen && "rotate-90",
                  )}
                />
              </button>
              <div className={cn("flex-col gap-1.5 px-5 pb-5", anamOpen ? "flex" : "hidden")}>
                {anamnese?.respostas.map((r) => (
                  <div
                    key={r.perguntaId}
                    className="bg-background flex justify-between rounded-[10px] px-3 py-2"
                  >
                    <span className="text-muted-foreground text-[13px]">
                      {textoPergunta(r.perguntaId)}
                    </span>
                    <span className="font-heading text-[13px] font-semibold">
                      {formatarResposta(r.tipo, r.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {detailTab === "orientacoes" && (
          <div className="flex flex-col gap-3.5">
            {!nivel && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Ainda sem orientações"
                description="As orientações aparecem depois que o diagnóstico for concluído."
              />
            )}
            {nivel && conteudos.length === 0 && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Nenhuma orientação cadastrada"
                description="Ainda não há conteúdo cadastrado para essa classificação."
              />
            )}
            {conteudos.map((c) => (
              <TipCard
                key={c.id}
                titulo={c.titulo}
                categoria={c.categoria}
                corpo={c.textos.join(" ")}
                formato="texto"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
