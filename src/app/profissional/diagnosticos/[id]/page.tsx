"use client";

import { use, useState, createElement } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  ScanLine,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  CircleCheck,
  BadgeCheck,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LevelChip } from "@/components/level-chip";
import { StatusBadge } from "@/components/status-badge";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnostico, useRevisarDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese } from "@/hooks/use-anamnese";
import { usePaciente } from "@/hooks/use-pacientes";
import { nivelColor, nivelLabel, nivelIcon } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import { formatarResposta } from "@/lib/anamnese-format";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { DiagnosticoNivel } from "@/types/diagnostico";

/**
 * O detalhe do diagnóstico no back não diz de quem ele é, então o paciente
 * chega pela URL (`?paciente=`), vindo da lista ou do detalhe do paciente.
 */
export default function DiagnosticoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/profissional/diagnosticos";
  const pacienteId = searchParams.get("paciente") ?? "";
  const [detailTab, setDetailTab] = useState<"detalhes" | "orientacoes">("detalhes");
  const [anamOpen, setAnamOpen] = useState(false);
  const [classificacao, setClassificacao] = useState<DiagnosticoNivel | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const { data: diagnostico, isError } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: paciente } = usePaciente(pacienteId);
  const revisar = useRevisarDiagnostico();

  if (isError) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<ScanLine className="h-7 w-7" />}
          title="Diagnóstico indisponível"
          description="Ele não existe ou é de um paciente que não está vinculado a você."
        />
      </div>
    );
  }
  if (!diagnostico) return null;

  const nivel = diagnostico.nivel;
  const conteudos = diagnostico.conteudos ?? [];
  const revisao = diagnostico.revisao;
  const fotoUrl = diagnostico.imagemUrl ? `${config.apiBaseUrl}${diagnostico.imagemUrl}` : null;
  const podeRevisar = diagnostico.status !== "processando" && diagnostico.status !== "falha";
  const classificacaoAtual = classificacao ?? nivel;
  const nomePaciente = paciente?.nome ?? "Paciente";

  function salvarRevisao() {
    if (!classificacaoAtual) return;
    revisar.mutate({ id, nivel: classificacaoAtual, observacoes });
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={nomePaciente} size={44} />
          <div className="min-w-0">
            <div className="font-heading truncate text-base font-extrabold text-white">
              {nomePaciente}
            </div>
            <div className="text-xs text-white/60">
              {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")} · Diagnóstico #
              {diagnostico.id}
            </div>
          </div>
        </div>
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
          <div className="shell:flex-row shell:items-start mt-3.5 flex flex-col gap-3.5">
            <div className="shell:flex-1 flex flex-col gap-3.5">
              <Card
                className="rounded-lg border border-[rgba(11,107,130,0.12)] p-5 shadow-sm ring-0"
                style={{
                  background: "linear-gradient(135deg,rgba(11,107,130,0.05),rgba(22,163,74,0.04))",
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary text-primary flex h-8 w-8 items-center justify-center rounded-[9px]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="font-heading text-primary text-sm font-extrabold">
                      Resultado da IA
                    </div>
                  </div>
                  <StatusBadge
                    label={statusDiagnosticoLabel(diagnostico.status)}
                    status={statusDiagnosticoBadgeStatus(diagnostico.status)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px]"
                    style={{ background: `${nivelColor(nivel)}18` }}
                  >
                    {createElement(nivelIcon(nivel), {
                      className: "h-7 w-7",
                      style: { color: nivelColor(nivel) },
                    })}
                  </div>
                  <div>
                    <LevelChip nivel={nivel} />
                    {diagnostico.confiancaIA !== undefined && (
                      <>
                        <div className="text-muted-foreground mt-1.5 mb-1.5 text-xs">
                          Confiança: {diagnostico.confiancaIA}%
                        </div>
                        <div className="bg-secondary h-1.25 w-30 overflow-hidden rounded-4xl">
                          <div
                            className="bg-primary h-full rounded-4xl"
                            style={{ width: `${diagnostico.confiancaIA}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="rounded-lg p-5 shadow-sm ring-0">
                <div className="font-heading mb-3 text-sm font-extrabold">Imagem capturada</div>
                <div className="relative flex aspect-4/3 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#0a3d4a]">
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo back por path dinâmico, fora do domínio de otimização do next/image
                    <img
                      src={fotoUrl}
                      alt="Foto da língua capturada"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="h-9 w-9 text-white/20" />
                      <span className="text-xs text-white/30">
                        Imagem capturada ·{" "}
                        {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                    </>
                  )}
                </div>
              </Card>
            </div>

            <div className="shell:flex-1 flex flex-col gap-3.5">
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
                {anamOpen && (
                  <div className="flex flex-col gap-1.5 px-5 pb-5">
                    {anamnese?.respostas.map((r) => (
                      <div
                        key={r.perguntaId}
                        className="bg-background flex justify-between gap-3 rounded-[10px] px-3 py-2"
                      >
                        <span className="text-muted-foreground text-[13px]">{r.enunciado}</span>
                        <span className="font-heading shrink-0 text-[13px] font-semibold">
                          {formatarResposta(r.tipo, r.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="border-primary rounded-lg border-2 p-5 shadow-sm ring-0">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="bg-secondary text-primary flex h-7.5 w-7.5 items-center justify-center rounded-[9px]">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="font-heading text-primary text-[15px] font-extrabold">
                    Sua avaliação
                  </div>
                </div>

                {revisao?.revisado && (
                  <div className="border-secondary bg-secondary/40 mb-3.5 rounded-xl border p-3.5">
                    <div className="font-heading text-primary mb-1 flex items-center gap-1.5 text-[13px] font-bold">
                      <BadgeCheck className="h-4 w-4" /> Já revisado
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {revisao.profissionalNome ?? "Profissional Hality"}
                      {revisao.revisadoEm &&
                        ` · ${new Date(revisao.revisadoEm).toLocaleDateString("pt-BR")}`}
                    </p>
                    {revisao.observacoes && (
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {revisao.observacoes}
                      </p>
                    )}
                  </div>
                )}

                {!podeRevisar ? (
                  <p className="text-muted-foreground text-sm">
                    {diagnostico.status === "falha"
                      ? "A análise da imagem falhou, então não há classificação para revisar."
                      : "A IA ainda está analisando a imagem. A revisão fica disponível quando terminar."}
                  </p>
                ) : (
                  <>
                    <div className="mb-3.5">
                      <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold">
                        Classificação confirmada
                      </label>
                      <div className="flex flex-col gap-2">
                        {([1, 2, 3] as DiagnosticoNivel[]).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setClassificacao(l)}
                            className="flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left"
                            style={{
                              borderColor:
                                classificacaoAtual === l ? nivelColor(l) : "var(--border)",
                              background:
                                classificacaoAtual === l ? `${nivelColor(l)}10` : "var(--card)",
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: nivelColor(l) }}
                            />
                            <span className="font-heading text-sm font-bold">
                              {l} — {nivelLabel(l)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Descreva suas observações clínicas..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={4}
                    />
                    {revisar.isSuccess && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#6EE7B7] bg-[#D1FAE5] px-3.5 py-2.5 text-[13px] font-semibold text-[#065F46]">
                        <CircleCheck className="h-4 w-4" /> Revisão salva e enviada ao paciente.
                      </div>
                    )}
                    {revisar.isError && (
                      <div className="border-destructive/30 bg-destructive/10 text-destructive mt-3 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold">
                        Não foi possível salvar a revisão. Tente novamente.
                      </div>
                    )}
                    <Button
                      size="lg"
                      className="mt-3.5 bg-[#16A34A] hover:bg-[#15803d]"
                      onClick={salvarRevisao}
                      disabled={!classificacaoAtual || revisar.isPending}
                    >
                      <CircleCheck className="h-4 w-4" />
                      {revisao?.revisado ? "Atualizar revisão" : "Salvar revisão"}
                    </Button>
                  </>
                )}
              </Card>
            </div>
          </div>
        )}

        {detailTab === "orientacoes" && (
          <div className="cyb-grid mt-3.5 gap-3.5">
            {!nivel && (
              <EmptyState
                icon={<ScanLine className="h-7 w-7" />}
                title="Ainda sem orientações"
                description="As orientações aparecem depois que o diagnóstico for classificado."
              />
            )}
            {nivel && conteudos.length === 0 && (
              <EmptyState
                icon={<ScanLine className="h-7 w-7" />}
                title="Nenhuma orientação cadastrada"
                description="Não há conteúdo ligado a esta classificação."
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
