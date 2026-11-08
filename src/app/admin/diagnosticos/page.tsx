"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Beaker, Clock, Download, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { DiagnosticoAdminCard } from "@/components/diagnostico-admin-card";
import { useDiagnosticosAdmin, useDiagnosticosAdminPaginados } from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { nivelColor } from "@/lib/level-format";
import { diagnosticoService } from "@/services/diagnostico-service";
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

// 403 é quando o usuário não tem permissão
function semPermissao(erro: unknown) {
  return erro instanceof ApiError && erro.status === 403;
}

/** Só o `total` interessa: `limite: 1` evita trazer itens para os contadores. */
function useTotal(filtro: Parameters<typeof useDiagnosticosAdmin>[0]) {
  return useDiagnosticosAdmin({ ...filtro, limite: 1 }).data?.total;
}

export default function DiagnosticosAdminPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDiagnostico | "todos">("todos");
  const [filtroNivel, setFiltroNivel] = useState<DiagnosticoNivel | null>(null);
  const [semClassificacao, setSemClassificacao] = useState(false);
  const [period, setPeriod] = useState<Period>("Todos");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [baixando, setBaixando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const downloadUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    };
  }, []);

  const filtroPeriodo = useMemo(
    () => periodoParaFiltro(period, customRange),
    [period, customRange],
  );
  const lista = useDiagnosticosAdminPaginados({
    ...filtroPeriodo,
    status: filtroStatus === "todos" ? undefined : filtroStatus,
    classificacao: filtroNivel ?? undefined,
    semClassificacao: semClassificacao || undefined,
    limite: 20,
  });
  const diagnosticos = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  // cor do quadrado de sem classificação
  const corSem = nivelColor(null);

  const contagem = {
    total: useTotal(filtroPeriodo),
    pendentes: useTotal({ ...filtroPeriodo, status: "aguardando_revisao" }),
    1: useTotal({ ...filtroPeriodo, classificacao: 1 }),
    2: useTotal({ ...filtroPeriodo, classificacao: 2 }),
    3: useTotal({ ...filtroPeriodo, classificacao: 3 }),
    // total dos que a IA ainda não classificou
    sem: useTotal({ ...filtroPeriodo, semClassificacao: true }),
  };

  const selecionadosElegiveis = diagnosticos.filter(
    (d) => selecionados.has(d.id) && d.exportavel && d.fonteRotulo !== "ia",
  );

  function limparSelecaoAntesDeMudarFiltro() {
    if (selecionados.size > 0) {
      setSelecionados(new Set());
      setMensagem("A seleção foi limpa porque os filtros foram alterados.");
    }
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(id)) proxima.delete(id);
      else proxima.add(id);
      return proxima;
    });
    setMensagem(null);
  }

  async function exportar() {
    if (baixando || selecionadosElegiveis.length === 0) return;
    setBaixando(true);
    setMensagem("Preparando o download do dataset…");
    try {
      const blob = await diagnosticoService.exportarDataset(selecionadosElegiveis.map((d) => d.id));
      const url = URL.createObjectURL(blob);
      downloadUrl.current = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = `hality-dataset-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      downloadUrl.current = null;
      setSelecionados(new Set());
      setModoSelecao(false);
      setMensagem(`${selecionadosElegiveis.length} diagnóstico(s) baixado(s).`);
    } catch (erro) {
      if (erro instanceof ApiError) {
        const mensagens: Record<number, string> = {
          401: "Sua sessão expirou. Entre novamente para baixar o dataset.",
          403: "Você não tem permissão para exportar o dataset.",
          409: "A elegibilidade mudou. A fila foi atualizada; revise a seleção.",
          413: "A seleção excede o limite de exportação.",
          500: "Não foi possível gerar o arquivo. Tente novamente.",
        };
        setMensagem(
          mensagens[erro.status] ??
            (erro.status >= 500
              ? "Erro temporário ao gerar o arquivo. Tente novamente."
              : "Não foi possível exportar o dataset."),
        );
        if (erro.status === 409) {
          await lista.refetch();
        }
      } else {
        setMensagem("Não foi possível exportar o dataset. Tente novamente.");
      }
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-xl text-white">Diagnósticos</h1>
          <Button
            type="button"
            size="sm"
            variant={modoSelecao ? "secondary" : "primary"}
            onClick={() => {
              setModoSelecao((atual) => !atual);
              setMensagem(null);
            }}
          >
            {modoSelecao ? "Cancelar seleção" : "Selecionar"}
          </Button>
        </div>
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => {
                limparSelecaoAntesDeMudarFiltro();
                setFiltroStatus(f.valor);
              }}
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
              onClick={() => {
                limparSelecaoAntesDeMudarFiltro();
                setPeriod(p);
              }}
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
          limparSelecaoAntesDeMudarFiltro();
          setCustomRange(range);
          setPeriod("custom");
          setCustomDialogOpen(false);
        }}
      />

      <div className="flex flex-col gap-2.5 p-4">
        <div className="sr-only" aria-live="polite">
          {mensagem}
        </div>
        {mensagem && (
          <Alert type={mensagem.includes("baixado") ? "success" : "error"} message={mensagem} />
        )}
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <h2 className="text-lg">Análise geral</h2>
          <p className="text-muted-foreground mb-4 text-[13px]">
            {contagem.total ?? "—"} diagnósticos · {contagem.pendentes ?? "—"} aguardando revisão
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {NIVEIS.map(({ nivel, label }) => {
              const cor = nivelColor(nivel);
              const ativo = filtroNivel === nivel;
              return (
                <button
                  key={nivel}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    limparSelecaoAntesDeMudarFiltro();
                    setFiltroNivel(ativo ? null : nivel);
                    setSemClassificacao(false);
                  }}
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
            <button
              type="button"
              aria-pressed={semClassificacao}
              onClick={() => {
                limparSelecaoAntesDeMudarFiltro();
                setSemClassificacao(!semClassificacao);
                setFiltroNivel(null);
              }}
              className="rounded-xl border-[1.5px] py-2.5 text-center"
              style={{
                background: `${corSem}12`,
                borderColor: semClassificacao ? corSem : `${corSem}30`,
              }}
            >
              <div className="font-heading text-xl font-black" style={{ color: corSem }}>
                {contagem.sem ?? "—"}
              </div>
              <div className="text-muted-foreground mt-1 text-[10px]">Sem classificação</div>
            </button>
          </div>
          <p className="text-muted-foreground mt-3 text-[11px]">
            Contagem pela classificação da IA. Toque num nível para filtrar a lista.
          </p>
        </Card>

        {lista.isError && !lista.data && (
          <div className="flex flex-col items-start gap-3">
            <Alert
              type="error"
              message={
                semPermissao(lista.error)
                  ? "Você não tem permissão para ver os diagnósticos."
                  : "Não foi possível carregar os diagnósticos."
              }
            />
            {!semPermissao(lista.error) && (
              <Button variant="secondary" size="sm" onClick={() => lista.refetch()}>
                Tentar de novo
              </Button>
            )}
          </div>
        )}
        {lista.isSuccess && diagnosticos.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum resultado"
            description="Ajuste os filtros."
          />
        )}
        <div className="cyb-grid diag-list-card flex flex-col gap-2.5">
          {diagnosticos.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              {modoSelecao && (
                <label
                  className="flex shrink-0 items-center p-1"
                  title={`Selecionar ${d.pacienteNome}`}
                >
                  <input
                    type="checkbox"
                    checked={selecionados.has(d.id)}
                    disabled={!d.exportavel || d.fonteRotulo === "ia"}
                    onChange={() => alternarSelecao(d.id)}
                    aria-label={`Selecionar diagnóstico de ${d.pacienteNome}, ${d.id}`}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </label>
              )}
              <div className="min-w-0 flex-1">
                <DiagnosticoAdminCard
                  diagnostico={d}
                  href={`/admin/diagnosticos/${d.id}?voltar=/admin/diagnosticos`}
                />
              </div>
            </div>
          ))}
        </div>
        <ScrollInfinito
          temMais={!!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
      {modoSelecao && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-white px-4 py-3">
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {selecionados.size} selecionado(s)
          </span>
          <Button
            type="button"
            size="sm"
            variant="success"
            disabled={baixando || selecionadosElegiveis.length === 0}
            onClick={exportar}
          >
            {baixando ? <LoaderCircle className="animate-spin" /> : <Download />}
            {baixando ? "Baixando…" : "Exportar dataset"}
          </Button>
        </div>
      )}
    </div>
  );
}
