"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScanLine, Stethoscope, CircleCheck, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { DiagnosticoDetalhe, NIVEIS } from "@/components/diagnostico-detalhe";
import {
  useDiagnostico,
  useDiagnosticoProfissional,
  useRevisarDiagnostico,
} from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import type { DiagnosticoNivel } from "@/types/diagnostico";

function mensagemDaRevisao(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) {
    return "Outra revisão foi salva enquanto você editava. A tela foi atualizada; confira e salve de novo.";
  }
  return "Não foi possível salvar a revisão. Tente novamente.";
}

/**
 * Junta o detalhe comum (foto, IA, análise, orientações) com a visão do
 * profissional (paciente, revisão atual, histórico e versão para revisar).
 */
export default function DiagnosticoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/profissional/diagnosticos";
  const [classificacao, setClassificacao] = useState<DiagnosticoNivel | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const { data: diagnostico, isError } = useDiagnostico(id);
  const { data: visaoProfissional, isError: erroProfissional } = useDiagnosticoProfissional(id);
  const revisar = useRevisarDiagnostico();

  if (isError || erroProfissional) {
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
  if (!diagnostico || !visaoProfissional) return null;

  const revisaoAtual = visaoProfissional.revisaoAtual;
  const podeRevisar = diagnostico.status !== "processando" && diagnostico.status !== "falha";
  const classificacaoAtual = classificacao ?? revisaoAtual?.nivel ?? diagnostico.nivel;
  const nomePaciente = visaoProfissional.pacienteNome;

  function salvarRevisao() {
    if (!classificacaoAtual || !visaoProfissional) return;
    revisar.mutate(
      { id, nivel: classificacaoAtual, observacoes, versao: visaoProfissional.versao },
      { onSuccess: () => setObservacoes("") },
    );
  }

  return (
    <DiagnosticoDetalhe
      diagnostico={diagnostico}
      titulo={nomePaciente}
      subtitulo={`${new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")} · Diagnóstico #${diagnostico.id}`}
      status={
        revisaoAtual
          ? { label: "Revisado", tipo: "success" }
          : {
              label: statusDiagnosticoLabel(diagnostico.status),
              tipo: statusDiagnosticoBadgeStatus(diagnostico.status),
            }
      }
      avatarNome={nomePaciente}
      voltarHref={voltarHref}
    >
      <Card className="border-primary rounded-lg border-2 p-5 shadow-sm ring-0">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="bg-secondary text-primary flex h-7.5 w-7.5 items-center justify-center rounded-[9px]">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="font-heading text-primary text-[15px] font-extrabold">Sua avaliação</div>
        </div>

        {revisaoAtual && (
          <div className="border-secondary bg-secondary/40 mb-3.5 rounded-xl border p-3.5">
            <div className="font-heading text-primary mb-1 flex items-center gap-1.5 text-[13px] font-bold">
              <BadgeCheck className="h-4 w-4" />
              Revisado como {nivelLabel(revisaoAtual.nivel)}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {revisaoAtual.profissionalNome ?? "Profissional Hality"} ·{" "}
              {new Date(revisaoAtual.criadoEm).toLocaleDateString("pt-BR")}
              {visaoProfissional.historico.length > 1 &&
                ` · ${visaoProfissional.historico.length} revisões no histórico`}
            </p>
            {revisaoAtual.observacao && (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {revisaoAtual.observacao}
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
          <div className="shell:grid shell:grid-cols-2 shell:gap-5 flex flex-col gap-3.5">
            <div>
              <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold">
                Classificação confirmada
              </label>
              <div className="flex flex-col gap-2">
                {NIVEIS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setClassificacao(l)}
                    className="flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left"
                    style={{
                      borderColor: classificacaoAtual === l ? nivelColor(l) : "var(--border)",
                      background: classificacaoAtual === l ? `${nivelColor(l)}10` : "var(--card)",
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

            <div className="flex flex-col">
              <label
                htmlFor="observacoes"
                className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold"
              >
                Observações clínicas
              </label>
              <Textarea
                id="observacoes"
                placeholder="Descreva suas observações clínicas..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
                maxLength={2000}
                className="shell:flex-1"
              />
              {revisar.isSuccess && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#6EE7B7] bg-[#D1FAE5] px-3.5 py-2.5 text-[13px] font-semibold text-[#065F46]">
                  <CircleCheck className="h-4 w-4" /> Revisão salva e enviada ao paciente.
                </div>
              )}
              {revisar.isError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mt-3 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold">
                  {mensagemDaRevisao(revisar.error)}
                </div>
              )}
              <Button
                size="lg"
                className="mt-3.5 bg-[#16A34A] hover:bg-[#15803d]"
                onClick={salvarRevisao}
                disabled={!classificacaoAtual || revisar.isPending}
              >
                <CircleCheck className="h-4 w-4" />
                {revisaoAtual ? "Salvar nova revisão" : "Salvar revisão"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </DiagnosticoDetalhe>
  );
}
