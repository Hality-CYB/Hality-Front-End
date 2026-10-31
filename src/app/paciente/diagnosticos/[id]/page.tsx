"use client";

import { use } from "react";
import { TriangleAlert, BadgeCheck } from "lucide-react";
import { CarregandoPagina, ErroPagina } from "@/components/estado-pagina";
import { ehNaoEncontrado } from "@/lib/erros";
import { DiagnosticoDetalhe } from "@/components/diagnostico-detalhe";
import { useDiagnostico } from "@/hooks/use-diagnosticos";
import { nivelLabel, nivelBadgeStatus } from "@/lib/level-format";
import { nivelFinal, type Diagnostico } from "@/types/diagnostico";
import { formatarData } from "@/lib/datas";

const STATUS_LABEL: Record<string, string> = {
  processando: "Aguardando análise",
  aguardando_revisao: "Aguardando revisão",
  falha: "Falha na análise",
};

function AvisoRevisao({
  revisao,
  temProfissionalVinculado,
}: {
  revisao: Diagnostico["revisao"];
  temProfissionalVinculado?: boolean;
}) {
  if (revisao?.revisado) {
    return (
      <div className="border-secondary bg-secondary/40 rounded-xl border p-3.5">
        <div className="font-heading text-primary mb-1 flex items-center gap-1.5 text-[13px] font-bold">
          <BadgeCheck className="h-4 w-4" /> Revisado por profissional
        </div>
        {/* Quando o nível foi corrigido, ele já aparece em destaque no resultado. */}
        {revisao.nivel && !revisao.nivelCorrigido && (
          <p className="text-foreground mb-1 text-xs font-semibold">
            Classificação confirmada: {nivelLabel(revisao.nivel)}
          </p>
        )}
        <p className="text-muted-foreground text-xs leading-relaxed">
          {revisao.profissionalNome ?? "Profissional Hality"}
          {revisao.revisadoEm && ` · ${formatarData(revisao.revisadoEm)}`}
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
        Pré-diagnóstico gerado por IA, ainda não revisado por um profissional.{" "}
        {temProfissionalVinculado === false &&
          "Ele só é revisado quando você tiver um profissional vinculado. "}
        Não substitui avaliação clínica.
      </p>
    </div>
  );
}

export default function DiagnosticoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: diagnostico, isError, error: erro, refetch } = useDiagnostico(id);

  if (isError) {
    return (
      <ErroPagina
        titulo={ehNaoEncontrado(erro) ? "Diagnóstico não encontrado" : "Não foi possível carregar"}
        descricao={
          ehNaoEncontrado(erro)
            ? "Ele pode ter sido removido."
            : "Confira sua conexão e tente de novo."
        }
        onTentarDeNovo={ehNaoEncontrado(erro) ? undefined : () => refetch()}
        voltar={{ href: "/paciente/diagnosticos", label: "Voltar para meus diagnósticos" }}
      />
    );
  }
  if (!diagnostico) return <CarregandoPagina />;

  const nivel = diagnostico.nivel;
  const nivelValido = nivelFinal(diagnostico);

  return (
    <DiagnosticoDetalhe
      diagnostico={diagnostico}
      titulo={`Diagnóstico #${diagnostico.id.slice(-4)}`}
      subtitulo={formatarData(diagnostico.criadoEm)}
      status={{
        label:
          nivelValido !== null
            ? nivelLabel(nivelValido)
            : (STATUS_LABEL[diagnostico.status] ?? diagnostico.status),
        tipo: nivelBadgeStatus(nivelValido),
      }}
      aviso={
        nivel ? (
          <AvisoRevisao
            revisao={diagnostico.revisao}
            temProfissionalVinculado={diagnostico.temProfissionalVinculado}
          />
        ) : undefined
      }
    />
  );
}
