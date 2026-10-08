"use client";

import { useMemo, useState } from "react";
import { Beaker, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { DiagnosticoAdminCard } from "@/components/diagnostico-admin-card";
import { useDiagnosticosAdmin, useDiagnosticosAdminPaginados } from "@/hooks/use-diagnosticos";
import { cn } from "@/lib/utils";
import { nivelColor } from "@/lib/level-format";
import {
  PERIODS,
  periodLabel,
  periodoParaFiltro,
  type Period,
  type CustomRange,
} from "@/lib/date-period";
import type { DiagnosticoNivel, StatusDiagnostico } from "@/types/diagnostico";

const FILTROS_STATUS: { valor: StatusDiagnostico | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aguardando_revisao", label: "Aguardando revisão" },
  { valor: "concluido", label: "Revisado" },
  { valor: "processando", label: "Processando" },
  { valor: "falha", label: "Falha" },
];

const NIVEIS: { nivel: DiagnosticoNivel; label: string }[] = [
  { nivel: 1, label: "Normal" },
  { nivel: 2, label: "Íntima" },
  { nivel: 3, label: "Social" },
];

/** Só o `total` interessa: `limite: 1` evita trazer itens para os contadores. */
function useTotal(filtro: Parameters<typeof useDiagnosticosAdmin>[0]) {
  return useDiagnosticosAdmin({ ...filtro, limite: 1 }).data?.total;
}

/*
 * TODO(backend): a busca por nome de paciente/profissional que existia aqui
 * saiu — `/admin/diagnosticos` não filtra por nome e o item não traz o nome do
 * paciente. A seleção para "Exportar dataset" também saiu: o back marca o
 * dataset como indisponível (DEC-04/DEC-07) e não há rota de exportação.
 */
export default function DiagnosticosAdminPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const [filtroNivel, setFiltroNivel] = useState<DiagnosticoNivel | null>(null);
  const [period, setPeriod] = useState<Period>("Todos");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const filtroPeriodo = useMemo(
    () => periodoParaFiltro(period, customRange),
    [period, customRange],
  );
  const lista = useDiagnosticosAdminPaginados({
    ...filtroPeriodo,
    status: filtroStatus === "todos" ? undefined : filtroStatus,
    classificacao: filtroNivel ?? undefined,
    limite: 20,
  });
  const diagnosticos = lista.data?.pages.flatMap((p) => p.itens) ?? [];

  const contagem = {
    total: useTotal(filtroPeriodo),
    pendentes: useTotal({ ...filtroPeriodo, status: "aguardando_revisao" }),
    1: useTotal({ ...filtroPeriodo, classificacao: 1 }),
    2: useTotal({ ...filtroPeriodo, classificacao: 2 }),
    3: useTotal({ ...filtroPeriodo, classificacao: 3 }),
  };

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Diagnósticos</h1>
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroStatus(f.valor)}
              className={cn(
                "font-heading shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                filtroStatus === f.valor
                  ? "bg-white text-[var(--primary)]"
                  : "bg-white/15 text-white/85",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "font-heading shrink-0 rounded-4xl border-[1.5px] px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white",
                period === p ? "border-white bg-white/20" : "border-white/30",
              )}
            >
              {periodLabel(p, null)}
            </button>
          ))}
          <button
            onClick={() => setCustomDialogOpen(true)}
            className={cn(
              "font-heading flex shrink-0 items-center gap-1 rounded-4xl border-[1.5px] px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white",
              period === "custom" ? "border-white bg-white/20" : "border-white/30",
            )}
          >
            <Clock className="h-3 w-3" /> {periodLabel("custom", customRange)}
          </button>
        </div>
      </div>

      <CustomPeriodDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        initial={customRange}
        onApply={(range) => {
          setCustomRange(range);
          setPeriod("custom");
          setCustomDialogOpen(false);
        }}
      />

      <div className="flex flex-col gap-2.5 p-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <h2 className="text-lg">Análise geral</h2>
          <p className="text-muted-foreground mb-4 text-[13px]">
            {contagem.total ?? "—"} diagnósticos · {contagem.pendentes ?? "—"} aguardando revisão
          </p>
          <div className="grid grid-cols-3 gap-2">
            {NIVEIS.map(({ nivel, label }) => {
              const cor = nivelColor(nivel);
              const ativo = filtroNivel === nivel;
              return (
                <button
                  key={nivel}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltroNivel(ativo ? null : nivel)}
                  className="rounded-xl border-[1.5px] py-2.5 text-center"
                  style={{ background: `${cor}12`, borderColor: ativo ? cor : `${cor}30` }}
                >
                  <div className="font-heading text-xl font-black" style={{ color: cor }}>
                    {contagem[nivel] ?? "—"}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[10px]">{label}</div>
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-3 text-[11px]">
            Contagem pela classificação da IA. Toque num nível para filtrar a lista.
          </p>
        </Card>

        {lista.isSuccess && diagnosticos.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros."
          />
        )}
        <div className="cyb-grid diag-list-card flex flex-col gap-2.5">
          {diagnosticos.map((d) => (
            <DiagnosticoAdminCard
              key={d.id}
              diagnostico={d}
              titulo={`Diagnóstico #${d.id}`}
              href={`/admin/diagnosticos/${d.id}?voltar=/admin/diagnosticos`}
            />
          ))}
        </div>
        <ScrollInfinito
          temMais={!!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
    </div>
  );
}
