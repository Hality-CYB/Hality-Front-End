"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Beaker, Clock, Download, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { CustomPeriodDialog } from "@/components/custom-period-dialog";
import { DiagnosticoAdminCard, type EstadoSelecao } from "@/components/diagnostico-admin-card";
import {
  useDiagnosticosAdmin,
  useDiagnosticosAdminPaginados,
  useExportarDataset,
} from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { nivelColor } from "@/lib/level-format";
import {
  PERIODS,
  periodLabel,
  periodoParaFiltro,
  type Period,
  type CustomRange,
} from "@/lib/date-period";
import type { DiagnosticoAdminResumo, MotivoInelegivel } from "@/types/admin";
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

const MOTIVO_FORA_DO_DATASET: Record<MotivoInelegivel, string> = {
  nao_concluido: "o diagnóstico ainda não foi concluído",
  sem_imagem: "não tem imagem",
  sem_rotulo_humano: "precisa de revisão ou rótulo Hality",
  sem_consentimento: "o paciente não autorizou o uso da imagem",
};

/** O que a faixa do card diz no modo de seleção. */
function estadoNoDataset(d: DiagnosticoAdminResumo, bloqueado: boolean): EstadoSelecao {
  if (bloqueado) return { texto: "Fora do dataset: a elegibilidade mudou", elegivel: false };
  const e = d.elegibilidade;
  if (!e) return { texto: "Elegibilidade indisponível", elegivel: false };
  if (e.exportavel) {
    const rotulo = e.fonte === "hality" ? "rótulo Hality" : "rótulo do profissional";
    return { texto: `Entra no dataset · ${rotulo}`, elegivel: true };
  }
  const motivo =
    MOTIVO_FORA_DO_DATASET[e.motivo as MotivoInelegivel] ?? "não atende às regras de exportação";
  return { texto: `Fora do dataset: ${motivo}`, elegivel: false };
}

function quantosSelecionados(n: number) {
  if (n === 0) return "Nenhum diagnóstico selecionado";
  return n === 1 ? "1 diagnóstico selecionado" : `${n} diagnósticos selecionados`;
}

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
  const [bloqueados, setBloqueados] = useState<Set<string>>(new Set());
  const exportacao = useExportarDataset();
  const downloadEmAndamento = useRef(false);
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
  const diagnosticos = useMemo(
    () => lista.data?.pages.flatMap((p) => p.itens) ?? [],
    [lista.data?.pages],
  );
  // A elegibilidade vem pronta da lista, calculada pelo back com as regras da exportação.
  const exportacaoHabilitada = lista.data?.pages.at(-1)?.exportacaoHabilitada ?? false;
  const exportavel = (d: DiagnosticoAdminResumo) =>
    !bloqueados.has(d.id) && d.elegibilidade?.exportavel === true;
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

  const elegiveis = diagnosticos.filter(exportavel);
  const selecionadosElegiveis = elegiveis.filter((d) => selecionados.has(d.id));
  const todosElegiveisSelecionados =
    elegiveis.length > 0 && selecionadosElegiveis.length === elegiveis.length;

  function limparSelecaoAntesDeMudarFiltro() {
    setBloqueados(new Set());
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
    if (
      downloadEmAndamento.current ||
      !exportacaoHabilitada ||
      selecionadosElegiveis.length === 0 ||
      selecionadosElegiveis.length !== selecionados.size
    )
      return;
    downloadEmAndamento.current = true;
    setBaixando(true);
    setMensagem("Preparando o download do dataset…");
    try {
      const blob = await exportacao.mutateAsync(selecionadosElegiveis.map((d) => d.id));
      const url = URL.createObjectURL(blob);
      downloadUrl.current = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = `hality-dataset-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.zip`;
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        if (downloadUrl.current === url) downloadUrl.current = null;
      }, 60_000);
      setSelecionados(new Set());
      setBloqueados(new Set());
      setModoSelecao(false);
      setMensagem(`Download iniciado: ${selecionadosElegiveis.length} diagnóstico(s).`);
    } catch (erro) {
      if (erro instanceof ApiError) {
        const mensagens: Record<number, string> = {
          401: "Sua sessão expirou. Entre novamente para baixar o dataset.",
          403: "Você não tem permissão para exportar o dataset.",
          413: "A seleção excede o limite de exportação.",
          500: "Não foi possível gerar o arquivo. Tente novamente.",
        };
        if (erro.status === 409) {
          let detail: unknown;
          try {
            detail = JSON.parse(erro.message)?.detail;
          } catch {
            /* resposta sem JSON */
          }
          if (typeof detail === "string" && detail.includes("indisponível")) {
            setMensagem("A exportação de dataset está indisponível no momento.");
          } else {
            const ids =
              typeof detail === "object" &&
              detail !== null &&
              "diagnostico_ids" in detail &&
              Array.isArray(detail.diagnostico_ids)
                ? detail.diagnostico_ids.map(String)
                : [];
            if (ids.length) {
              setBloqueados((atual) => new Set([...atual, ...ids]));
              setSelecionados((atual) => new Set([...atual].filter((id) => !ids.includes(id))));
            }
            setMensagem("A elegibilidade mudou. Revise a seleção antes de exportar novamente.");
            await lista.refetch();
          }
        } else {
          setMensagem(
            mensagens[erro.status] ??
              (erro.status >= 500
                ? "Erro temporário ao gerar o arquivo. Tente novamente."
                : "Não foi possível exportar o dataset."),
          );
        }
      } else {
        setMensagem("Não foi possível exportar o dataset. Tente novamente.");
      }
    } finally {
      downloadEmAndamento.current = false;
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
            disabled={baixando}
            onClick={() => {
              const proximo = !modoSelecao;
              setModoSelecao(proximo);
              if (!proximo) {
                setSelecionados(new Set());
                setBloqueados(new Set());
              }
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
              disabled={baixando}
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
              disabled={baixando}
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
            disabled={baixando}
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
        {mensagem && (
          <Alert
            type={
              mensagem.startsWith("Download iniciado")
                ? "success"
                : baixando || mensagem.startsWith("A seleção foi limpa")
                  ? "info"
                  : "error"
            }
            message={mensagem}
          />
        )}
        {modoSelecao && !exportacaoHabilitada && lista.isSuccess && (
          <Alert
            type="info"
            message="A exportação do dataset está desligada neste ambiente. A lista ainda mostra o que entraria nela."
          />
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
                  disabled={baixando}
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
              disabled={baixando}
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
        <div
          className={cn(
            "cyb-grid diag-list-card flex flex-col gap-2.5",
            // Na seleção a faixa de elegibilidade fecha cada card: a linha fica com altura igual.
            modoSelecao && "cyb-grid--stretch",
          )}
        >
          {diagnosticos.map((d) => (
            <DiagnosticoAdminCard
              key={d.id}
              diagnostico={d}
              href={`/admin/diagnosticos/${d.id}?voltar=/admin/diagnosticos`}
              selecionando={modoSelecao}
              selecionado={selecionados.has(d.id)}
              selecaoDesabilitada={baixando || (!selecionados.has(d.id) && !exportavel(d))}
              estadoSelecao={estadoNoDataset(d, bloqueados.has(d.id))}
              onAlternarSelecao={() => alternarSelecao(d.id)}
            />
          ))}
        </div>
        <ScrollInfinito
          temMais={!baixando && !!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
      {modoSelecao && (
        <div
          role="region"
          aria-label="Seleção para exportação"
          className="shell:bottom-0 shell:pb-3 sticky -bottom-4 z-10 border-t bg-white/95 px-4 pt-3 pb-7 shadow-[0_-6px_18px_rgba(15,23,42,0.06)] backdrop-blur"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-bold" aria-live="polite">
                {quantosSelecionados(selecionados.size)}
              </p>
              <p id="selecao-elegiveis-descricao" className="text-muted-foreground text-xs">
                {exportacaoHabilitada
                  ? `${elegiveis.length} elegíveis entre os ${diagnosticos.length} carregados`
                  : "Exportação desligada neste ambiente"}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                aria-describedby="selecao-elegiveis-descricao"
                disabled={
                  baixando ||
                  lista.isFetchingNextPage ||
                  (elegiveis.length === 0 && selecionados.size === 0)
                }
                onClick={() => {
                  setSelecionados(
                    todosElegiveisSelecionados ? new Set() : new Set(elegiveis.map((d) => d.id)),
                  );
                  setMensagem(null);
                }}
              >
                {todosElegiveisSelecionados ? "Limpar seleção" : "Selecionar elegíveis"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="success"
                className="flex-1 sm:flex-none"
                disabled={
                  baixando ||
                  !exportacaoHabilitada ||
                  selecionadosElegiveis.length === 0 ||
                  selecionadosElegiveis.length !== selecionados.size
                }
                onClick={exportar}
              >
                {baixando ? <LoaderCircle className="animate-spin" /> : <Download />}
                {baixando ? "Baixando…" : "Exportar dataset"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
