import { createElement } from "react";
import Link from "next/link";
import { Check, ChevronRight, CircleCheck, CircleMinus, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { nivelColor, nivelIcon } from "@/lib/level-format";
import { statusDiagnosticoBadgeStatus, statusDiagnosticoLabel } from "@/lib/status-format";
import type { DiagnosticoAdminResumo } from "@/types/admin";
import { formatarData } from "@/lib/datas";
import { cn } from "@/lib/utils";

/** Linha de elegibilidade no modo de seleção da fila. */
export type EstadoSelecao = { texto: string; elegivel: boolean };

type DiagnosticoAdminCardProps = {
  diagnostico: DiagnosticoAdminResumo;
  href: string;
  /** Padrão: o nome do paciente. Na lista de um paciente só, o número do diagnóstico. */
  titulo?: string;
  selecionando?: boolean;
  selecionado?: boolean;
  selecaoDesabilitada?: boolean;
  estadoSelecao?: EstadoSelecao;
  onAlternarSelecao?: () => void;
};

/**
 * Linha de diagnóstico nas telas do admin. Mostra o nível que vale (revisado
 * prevalece sobre a IA): sem revisão, o chip leva "IA"; com revisão que mudou
 * o resultado, "Ajustado".
 *
 * O card tem o mesmo desenho dentro e fora do modo de seleção: ao selecionar,
 * aparecem o quadradinho no canto superior esquerdo e a faixa que diz se ele
 * entra no dataset. O card inteiro marca e desmarca; a seta continua abrindo o
 * detalhe. Quem fica fora do dataset aparece esmaecido e sem o quadradinho.
 */
export function DiagnosticoAdminCard({
  diagnostico: d,
  href,
  titulo,
  selecionando = false,
  selecionado = false,
  selecaoDesabilitada = false,
  estadoSelecao,
  onAlternarSelecao,
}: DiagnosticoAdminCardProps) {
  const rotuloNivel = !d.revisao.revisado ? "IA" : d.nivelCorrigido ? "Ajustado" : null;
  const idCheckbox = `selecionar-diagnostico-${d.id}`;
  const cor = nivelColor(d.nivel);
  const foraDoDataset = selecionando && !selecionado && selecaoDesabilitada;

  const conteudo = (
    <>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${cor}18` }}
      >
        {createElement(nivelIcon(d.nivel), { className: "h-5 w-5", style: { color: cor } })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-heading truncate text-sm font-bold">{titulo ?? d.pacienteNome}</div>
        <div className="text-muted-foreground mb-1.5 truncate text-xs">
          {formatarData(d.criadoEm)}
          {titulo === undefined && ` · #${d.id}`}
        </div>
        <StatusBadge
          label={statusDiagnosticoLabel(d.status)}
          status={statusDiagnosticoBadgeStatus(d.status)}
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {d.nivel !== null ? (
          <>
            <LevelChip nivel={d.nivel} size="sm" />
            {rotuloNivel && (
              <span className="text-muted-foreground text-[11px]">{rotuloNivel}</span>
            )}
          </>
        ) : (
          <Clock className="text-gray-3 h-5 w-5" aria-label="Sem classificação" />
        )}
      </div>
    </>
  );

  if (!selecionando) {
    return (
      <Card className="diag-list-card relative gap-0 rounded-lg p-0 shadow-sm ring-0">
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3.5 p-4 before:absolute before:inset-0"
        >
          {conteudo}
          <ChevronRight className="text-gray-3 h-4 w-4 shrink-0" />
        </Link>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "diag-list-card relative h-full gap-0 rounded-lg p-0 shadow-sm ring-0 transition",
        selecionado && "ring-primary ring-2",
        foraDoDataset && "bg-gray-50 shadow-none grayscale",
      )}
    >
      <div className="flex flex-1 items-center gap-3.5 p-4">
        <input
          id={idCheckbox}
          type="checkbox"
          checked={selecionado}
          disabled={selecaoDesabilitada}
          onChange={onAlternarSelecao}
          aria-label={`Selecionar diagnóstico de ${d.pacienteNome}, ${d.id}`}
          aria-describedby={`elegibilidade-${d.id}`}
          className="peer sr-only"
        />
        {!foraDoDataset && (
          <span
            aria-hidden
            className={cn(
              "peer-focus-visible:ring-ring absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-tl-lg rounded-br-lg border-r-2 border-b-2 transition-colors peer-focus-visible:ring-2",
              selecionado
                ? "bg-primary border-primary text-white"
                : "border-gray-300 bg-gray-50 text-transparent",
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
        <label
          htmlFor={idCheckbox}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3.5",
            selecaoDesabilitada ? "cursor-not-allowed" : "cursor-pointer",
            foraDoDataset && "opacity-55",
          )}
        >
          {conteudo}
        </label>
        <Link
          href={href}
          aria-label={`Abrir o diagnóstico ${d.id}`}
          className="text-gray-3 hover:text-foreground -m-2 shrink-0 rounded-lg p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div
        id={`elegibilidade-${d.id}`}
        className={cn(
          "border-border flex items-start gap-1.5 border-t px-4 py-2.5 text-xs",
          estadoSelecao?.elegivel ? "text-[#15803d]" : "text-muted-foreground",
        )}
      >
        {estadoSelecao?.elegivel ? (
          <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <CircleMinus className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span>{estadoSelecao?.texto ?? "Elegibilidade indisponível"}</span>
      </div>
    </Card>
  );
}
