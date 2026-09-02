"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ScanLine,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  CircleCheck,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LevelChip } from "@/components/level-chip";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnostico, useRevisarDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese, useAnamnesePerguntas } from "@/hooks/use-anamnese";
import { useDicas } from "@/hooks/use-dicas";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { cn } from "@/lib/utils";
import type { DiagnosticoNivel } from "@/types/diagnostico";

const PROFISSIONAL_ID_PLACEHOLDER = "profissional-1";

export default function DiagnosticoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [anamOpen, setAnamOpen] = useState(false);
  const [classificacao, setClassificacao] = useState<DiagnosticoNivel | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const { data: diagnostico } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: perguntas } = useAnamnesePerguntas();
  const { data: dicas } = useDicas({ publicado: true });
  const revisar = useRevisarDiagnostico();

  if (!diagnostico) return null;

  const nivel = diagnostico.nivel;
  const orientacoes = (dicas ?? []).filter((d) => nivel && d.niveis.includes(nivel));
  const textoPergunta = (perguntaId: string) =>
    perguntas?.find((p) => p.id === perguntaId)?.texto ?? perguntaId;

  function salvarRevisao() {
    if (!classificacao) return;
    revisar.mutate({ id, nivel: classificacao, revisadoPor: PROFISSIONAL_ID_PLACEHOLDER });
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/profissional/diagnosticos"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={diagnostico.pacienteId} size={44} />
          <div>
            <div className="font-heading text-base font-extrabold text-white">
              Paciente {diagnostico.pacienteId.slice(-1)}
            </div>
            <div className="text-xs text-white/60">
              {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")} · Diagnóstico #
              {diagnostico.id.slice(-4)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="detalhes">
          <TabsList className="w-full">
            <TabsTrigger value="detalhes" className="flex-1">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="orientacoes" className="flex-1">
              Orientações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orientacoes" className="mt-3.5 flex flex-col gap-3.5">
            {!nivel && (
              <EmptyState
                icon={<ScanLine className="h-7 w-7" />}
                title="Ainda sem orientações"
                description="As orientações aparecem depois que o diagnóstico for classificado."
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
          </TabsContent>

          <TabsContent value="detalhes" className="mt-3.5 flex flex-col gap-3.5">
            <Card
              className="rounded-lg border border-[rgba(11,107,130,0.12)] p-5 shadow-sm ring-0"
              style={{
                background: "linear-gradient(135deg,rgba(11,107,130,0.05),rgba(22,163,74,0.04))",
              }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-secondary text-primary flex h-8 w-8 items-center justify-center rounded-[9px]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="font-heading text-primary text-sm font-extrabold">
                  Resultado da IA
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px]"
                  style={{ background: `${nivelColor(nivel)}18` }}
                >
                  <ScanLine className="h-7 w-7" style={{ color: nivelColor(nivel) }} />
                </div>
                <div>
                  <LevelChip nivel={nivel} />
                  {diagnostico.confiancaIA && (
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

            <Card className="overflow-hidden rounded-lg p-0 shadow-sm ring-0">
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
                      className="bg-background flex justify-between rounded-[10px] px-3 py-2"
                    >
                      <span className="text-muted-foreground text-[13px]">
                        {textoPergunta(r.perguntaId)}
                      </span>
                      <span className="font-heading text-[13px] font-semibold">{r.valor}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-lg p-5 shadow-sm ring-0">
              <div className="font-heading mb-3 text-sm font-extrabold">Imagem capturada</div>
              <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-2xl bg-[#0a3d4a]">
                <ImageIcon className="h-9 w-9 text-white/20" />
                <span className="text-xs text-white/30">
                  Imagem capturada · {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
                </span>
              </div>
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
              <div className="mb-3.5">
                <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
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
                        borderColor: classificacao === l ? nivelColor(l) : "var(--border)",
                        background: classificacao === l ? `${nivelColor(l)}10` : "var(--card)",
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
                  <CircleCheck className="h-4 w-4" /> Revisão salva e enviada ao paciente!
                </div>
              )}
              <div className="mt-3.5 flex gap-2.5">
                <Button variant="secondary" asChild>
                  <Link href="/profissional/diagnosticos">Cancelar</Link>
                </Button>
                <Button
                  className="flex-1 bg-[#16A34A] hover:bg-[#15803d]"
                  onClick={salvarRevisao}
                  disabled={!classificacao || revisar.isPending}
                >
                  <CircleCheck className="h-4 w-4" /> Salvar revisão
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
