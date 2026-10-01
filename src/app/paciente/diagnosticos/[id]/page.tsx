"use client";

import { use } from "react";
import { TriangleAlert, BadgeCheck } from "lucide-react";
import { DiagnosticoDetalhe } from "@/components/diagnostico-detalhe";
import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { useAnamnese } from "@/hooks/use-anamnese";
import { nivelLabel, nivelBadgeStatus } from "@/lib/level-format";
import type { Diagnostico } from "@/types/diagnostico";

const STATUS_LABEL: Record<string, string> = {
  processando: "Aguardando análise",
  aguardando_revisao: "Aguardando revisão",
  falha: "Falha na análise",
};

function AvisoRevisao({ revisao }: { revisao: Diagnostico["revisao"] }) {
  if (revisao?.revisado) {
    return (
      <div className="border-secondary bg-secondary/40 rounded-xl border p-3.5">
        <div className="font-heading text-primary mb-1 flex items-center gap-1.5 text-[13px] font-bold">
          <BadgeCheck className="h-4 w-4" /> Revisado por profissional
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {revisao.profissionalNome ?? "Profissional Hality"}
          {revisao.revisadoEm && ` · ${new Date(revisao.revisadoEm).toLocaleDateString("pt-BR")}`}
        </p>
        {revisao.observacoes && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {revisao.observacoes}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#FFC107] bg-[#FFF3CD] p-3.5">
      <TriangleAlert className="h-4.5 w-4.5 shrink-0 text-[#92400E]" />
      <p className="text-xs leading-relaxed text-[#92400E]">
        Pré-diagnóstico gerado por IA, ainda não revisado por um profissional. Não substitui
        avaliação clínica.
      </p>
    </div>
  );
}

export default function DiagnosticoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: diagnostico } = useDiagnostico(id);
  const { data: anamnese } = useAnamnese(diagnostico?.anamneseId);

  if (!diagnostico) return null;

  const nivel = diagnostico.nivel;

  return (
    <DiagnosticoDetalhe
      diagnostico={diagnostico}
      anamnese={anamnese}
      titulo={`Diagnóstico #${diagnostico.id.slice(-4)}`}
      subtitulo={new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}
      status={{
        label:
          diagnostico.status === "concluido"
            ? nivelLabel(nivel)
            : (STATUS_LABEL[diagnostico.status] ?? diagnostico.status),
        tipo: nivelBadgeStatus(nivel),
      }}
      aviso={nivel ? <AvisoRevisao revisao={diagnostico.revisao} /> : undefined}
    />
  );
}
