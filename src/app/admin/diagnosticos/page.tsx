"use client";

import { useState } from "react";
import Link from "next/link";
import { Beaker, Clock, Check, FileText, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { useUsuarios } from "@/hooks/use-usuarios";
import { cn } from "@/lib/utils";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import { nivelColor } from "@/lib/level-format";
import { PERIODS, periodLabel, inPeriod, type Period, type CustomRange } from "@/lib/date-period";
import type { StatusDiagnostico } from "@/types/diagnostico";

const FILTROS_STATUS: { valor: StatusDiagnostico | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aguardando_revisao", label: "Aguardando revisão" },
  { valor: "concluido", label: "Revisado" },
];

export default function DiagnosticosAdminPage() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const [period, setPeriod] = useState<Period>("Todos");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [exportado, setExportado] = useState(false);
  const { data: diagnosticos } = useDiagnosticos();
  const { data: usuarios } = useUsuarios();

  const filtrados = (diagnosticos ?? [])
    .filter((d) => filtroStatus === "todos" || d.status === filtroStatus)
    .filter((d) => inPeriod(new Date(d.criadoEm).toLocaleDateString("pt-BR"), period, customRange))
    .filter((d) => {
      if (!busca.trim()) return true;
      const nomePaciente = usuarios?.find((u) => u.id === d.pacienteId)?.nome ?? "";
      const nomeProfissional = usuarios?.find((u) => u.id === d.profissionalId)?.nome ?? "";
      const termo = busca.toLowerCase();
      return (
        nomePaciente.toLowerCase().includes(termo) || nomeProfissional.toLowerCase().includes(termo)
      );
    });

  const contagem = {
    total: diagnosticos?.length ?? 0,
    pendentes: diagnosticos?.filter((d) => d.status === "aguardando_revisao").length ?? 0,
    nivel1: diagnosticos?.filter((d) => d.nivel === 1).length ?? 0,
    nivel2: diagnosticos?.filter((d) => d.nivel === 2).length ?? 0,
    nivel3: diagnosticos?.filter((d) => d.nivel === 3).length ?? 0,
  };

  function alternarSelecao(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function sairSelecao() {
    setSelecionando(false);
    setSelecionados([]);
    setExportado(false);
  }

  function exportarDataset() {
    setExportado(true);
    setTimeout(sairSelecao, 1400);
  }

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl text-white">Diagnósticos</h1>
          <button
            onClick={() => (selecionando ? sairSelecao() : setSelecionando(true))}
            className={cn(
              "font-heading rounded-[10px] px-3.5 py-2 text-xs font-bold",
              selecionando ? "bg-white text-[var(--primary)]" : "bg-white/15 text-white",
            )}
          >
            {selecionando ? "Cancelar" : "Selecionar"}
          </button>
        </div>
        <div className="relative mb-2">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por paciente ou profissional..."
            className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pr-3.5 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
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
            {contagem.total} diagnósticos · {contagem.pendentes} aguardando revisão
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Normal", valor: contagem.nivel1, cor: nivelColor(1) },
              { label: "Íntima", valor: contagem.nivel2, cor: nivelColor(2) },
              { label: "Social", valor: contagem.nivel3, cor: nivelColor(3) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border py-2.5 text-center"
                style={{ background: `${s.cor}12`, borderColor: `${s.cor}30` }}
              >
                <div className="font-heading text-xl font-black" style={{ color: s.cor }}>
                  {s.valor}
                </div>
                <div className="text-muted-foreground mt-1 text-[10px]">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {filtrados.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros."
          />
        )}
        <div
          className={cn("cyb-grid diag-list-card flex flex-col gap-2.5", selecionando && "mb-16")}
        >
          {filtrados.map((d) => {
            const paciente = usuarios?.find((u) => u.id === d.pacienteId);
            const nomePaciente = paciente?.nome ?? `Paciente ${d.pacienteId.slice(-1)}`;
            const conteudo = (
              <Card className="diag-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                {selecionando && (
                  <div
                    className={cn(
                      "flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[7px] border-[1.5px]",
                      selecionados.includes(d.id)
                        ? "border-primary bg-primary"
                        : "border-border bg-white",
                    )}
                  >
                    {selecionados.includes(d.id) && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                )}
                <AvatarWithRole nome={nomePaciente} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{nomePaciente}</div>
                  <div className="text-muted-foreground mb-1.5 truncate text-xs">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </div>
                  <StatusBadge
                    label={statusDiagnosticoLabel(d.status)}
                    status={statusDiagnosticoBadgeStatus(d.status)}
                  />
                </div>
                {d.nivel !== null ? (
                  <LevelChip nivel={d.nivel} size="sm" />
                ) : (
                  <Clock className="text-gray-3 h-5 w-5" />
                )}
                {!selecionando && <ChevronRight className="text-gray-3 h-4 w-4" />}
              </Card>
            );
            return selecionando ? (
              <button key={d.id} onClick={() => alternarSelecao(d.id)} className="text-left">
                {conteudo}
              </button>
            ) : (
              <Link key={d.id} href={`/admin/diagnosticos/${d.id}?voltar=/admin/diagnosticos`}>
                {conteudo}
              </Link>
            );
          })}
        </div>
      </div>

      {selecionando && (
        <div className="border-border sticky bottom-0 flex items-center gap-2.5 border-t bg-white p-4">
          <span className="text-muted-foreground flex-1 text-[13px]">
            {selecionados.length} selecionado{selecionados.length !== 1 ? "s" : ""}
          </span>
          <Button variant="success" disabled={selecionados.length === 0} onClick={exportarDataset}>
            <FileText className="h-4 w-4" /> {exportado ? "Exportado!" : "Exportar dataset"}
          </Button>
        </div>
      )}
    </div>
  );
}
