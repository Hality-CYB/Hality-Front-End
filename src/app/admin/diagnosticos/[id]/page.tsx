"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ScanLine, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese, useAnamnesePerguntas } from "@/hooks/use-anamnese";
import { useUsuarios } from "@/hooks/use-usuarios";
import { nivelColor } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import { cn } from "@/lib/utils";

export default function DiagnosticoDetailAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/admin/diagnosticos";
  const [anamOpen, setAnamOpen] = useState(false);

  const { data: diagnostico } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);
  const { data: perguntas } = useAnamnesePerguntas();
  const { data: usuarios } = useUsuarios();

  if (!diagnostico) return null;

  const nomePaciente =
    usuarios?.find((u) => u.id === diagnostico.pacienteId)?.nome ??
    `Paciente ${diagnostico.pacienteId.slice(-1)}`;

  const textoPergunta = (perguntaId: string) =>
    perguntas?.find((p) => p.id === perguntaId)?.texto ?? perguntaId;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-end justify-between p-5"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div>
          <Link
            href={voltarHref}
            className="font-heading mb-3 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            <AvatarWithRole nome={nomePaciente} size={44} />
            <div>
              <div className="font-heading text-base font-extrabold text-white">{nomePaciente}</div>
              <div className="text-xs text-white/60">
                {new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>
        </div>
        <StatusBadge
          label={statusDiagnosticoLabel(diagnostico.status)}
          status={statusDiagnosticoBadgeStatus(diagnostico.status)}
        />
      </div>

      <div className="shell:flex-row shell:items-start flex flex-col gap-3.5 p-4">
        <div className="shell:flex-1 flex flex-col gap-3.5">
          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-4 text-center">
              <div
                className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-[22px]"
                style={{ background: `${nivelColor(diagnostico.nivel)}18` }}
              >
                <ScanLine className="h-9 w-9" style={{ color: nivelColor(diagnostico.nivel) }} />
              </div>
              <LevelChip nivel={diagnostico.nivel} size="lg" />
              {diagnostico.confiancaIA && (
                <div className="text-muted-foreground mt-2 text-xs">
                  Confiança da IA: {diagnostico.confiancaIA}%
                </div>
              )}
            </div>
            <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-2xl bg-[#0a3d4a]">
              <ImageIcon className="h-8 w-8 text-white/20" />
              <span className="font-heading text-xs text-white/40">Imagem capturada</span>
            </div>
          </Card>

          <div className="shell:flex hidden gap-2.5">
            <Button variant="secondary" className="flex-1">
              Exportar PDF
            </Button>
            <Button variant="danger" size="sm" className="flex-1">
              Excluir
            </Button>
          </div>
        </div>

        <div className="shell:flex-1 flex flex-col gap-3.5">
          <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
            <button
              onClick={() => setAnamOpen((o) => !o)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="font-heading text-sm font-extrabold">Anamnese</div>
              <ChevronRight
                className={cn("text-gray-3 h-4 w-4 transition-transform", anamOpen && "rotate-90")}
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
            <div className="font-heading mb-2 text-sm font-extrabold">Rastreabilidade</div>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão do modelo</span>
                <span className="font-heading font-semibold">{diagnostico.modeloVersao}</span>
              </div>
              {diagnostico.revisadoPor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revisado por</span>
                  <span className="font-heading font-semibold">{diagnostico.revisadoPor}</span>
                </div>
              )}
            </div>
          </Card>

          <div className="shell:hidden flex gap-2.5">
            <Button variant="secondary" className="flex-1">
              Exportar PDF
            </Button>
            <Button variant="danger" size="sm" className="flex-1">
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
