"use client";

import { useState } from "react";
import { Sparkles, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { nivelLabel } from "@/lib/level-format";
import { cn } from "@/lib/utils";
import type { ConcordanciaIA } from "@/types/admin";
import type { DiagnosticoNivel } from "@/types/diagnostico";

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

/**
 * Rampa sequencial de um tom só (o teal do app), clara para poucos casos e
 * escura para muitos. Nos passos escuros o texto é branco para manter o contraste.
 */
const RAMPA = [
  { fundo: "#e8f5f9", texto: "#0a3d4a" },
  { fundo: "#c5e2ea", texto: "#0a3d4a" },
  { fundo: "#7fc0d1", texto: "#0a3d4a" },
  { fundo: "#0d8aa6", texto: "#ffffff" },
  { fundo: "#0b6b82", texto: "#ffffff" },
  { fundo: "#0a3d4a", texto: "#ffffff" },
];

function passo(total: number, maximo: number) {
  if (total === 0 || maximo === 0) return null;
  return RAMPA[Math.min(RAMPA.length - 1, Math.ceil((total / maximo) * RAMPA.length) - 1)];
}

function porcentagem(parte: number, todo: number) {
  return todo === 0 ? 0 : Math.round((parte / todo) * 100);
}

function plural(n: number) {
  return n === 1 ? "1 diagnóstico" : `${n} diagnósticos`;
}

/** Resume os erros numa frase: a troca que mais se repete, ou que eles estão espalhados. */
function fraseDosErros(matriz: ConcordanciaIA["matriz"]): string {
  const erros = matriz
    .filter((c) => c.ia !== c.revisao && c.total > 0)
    .sort((a, b) => b.total - a.total);
  const [maior, segunda] = erros;
  if (!maior) return "Em todos os casos revisados, a revisão manteve o nível da IA.";
  if (segunda && segunda.total === maior.total) {
    const casos = erros.reduce((soma, c) => soma + c.total, 0);
    return `A revisão mudou o nível em ${plural(casos)}, sem uma troca que se repita mais que as outras.`;
  }
  return `A troca mais comum: a IA disse ${nivelLabel(maior.ia)} e a revisão decidiu ${nivelLabel(maior.revisao)} (${plural(maior.total)}).`;
}

type Props = {
  /** `undefined` enquanto carrega; `null` contra um back que ainda não manda. */
  concordancia: ConcordanciaIA | null | undefined;
};

/**
 * Quanto a classificação da IA bate com a revisão humana (profissional ou
 * Equipe Hality) nos últimos 30 dias: a taxa em destaque, o acerto por nível e
 * a matriz IA × revisão, que mostra onde ela erra.
 */
export function ConcordanciaIaCard({ concordancia }: Props) {
  const [foco, setFoco] = useState<{ ia: DiagnosticoNivel; revisao: DiagnosticoNivel } | null>(
    null,
  );

  if (concordancia === null) return null;

  const carregando = concordancia === undefined;
  const comparados = concordancia?.comparados ?? 0;
  const matriz = concordancia?.matriz ?? [];
  const total = (ia: DiagnosticoNivel, revisao: DiagnosticoNivel) =>
    matriz.find((c) => c.ia === ia && c.revisao === revisao)?.total ?? 0;
  const maximo = Math.max(0, ...matriz.map((c) => c.total));
  const taxa = concordancia?.taxa ?? null;

  return (
    <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
      <div className="mb-5">
        <h2 className="text-lg">Desempenho da IA</h2>
        <p className="text-muted-foreground text-xs">
          Quanto a classificação da IA bate com a revisão humana, nos últimos 30 dias.
        </p>
      </div>

      {!carregando && comparados === 0 ? (
        <p className="text-muted-foreground bg-background rounded-xl px-4 py-6 text-center text-sm">
          Ainda não há diagnósticos revisados nos últimos 30 dias para comparar com a IA.
        </p>
      ) : (
        <div className="shell:grid shell:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] shell:gap-8 flex flex-col gap-6">
          {/* Número em destaque e acerto por nível */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-muted-foreground mb-1 text-xs">Acerto da IA</div>
              <div className="font-heading text-[52px] leading-none font-black text-[#0a3d4a]">
                {carregando || taxa === null ? "—" : `${Math.round(taxa * 100)}%`}
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8f5f9]"
                role="meter"
                aria-label="Acerto da IA"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={taxa === null ? undefined : Math.round(taxa * 100)}
              >
                <div
                  className="h-full rounded-full bg-[#0b6b82] transition-[width] duration-500"
                  style={{ width: `${taxa === null ? 0 : Math.round(taxa * 100)}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-[13px]">
                {carregando
                  ? "Carregando…"
                  : `A revisão manteve o nível da IA em ${concordancia.concordantes} de ${plural(comparados)} revisados.`}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-muted-foreground text-xs">Acerto por nível dado pela IA</div>
              {NIVEIS.map((nivel) => {
                const daLinha = NIVEIS.reduce((soma, r) => soma + total(nivel, r), 0);
                const certos = total(nivel, nivel);
                const pct = porcentagem(certos, daLinha);
                return (
                  <div key={nivel} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="font-heading font-semibold">{nivelLabel(nivel)}</span>
                      <span className="text-muted-foreground text-xs">
                        {daLinha === 0 ? "sem revisões" : `${pct}% · ${certos} de ${daLinha}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8f5f9]">
                      <div
                        className="h-full rounded-full bg-[#0d8aa6]"
                        style={{ width: `${daLinha === 0 ? 0 : pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz IA × revisão */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative">
              <table className="w-full table-fixed border-separate border-spacing-1.5 text-center">
                <caption className="sr-only">
                  Diagnósticos por nível dado pela IA (linhas) e nível decidido na revisão (colunas)
                </caption>
                <thead>
                  <tr>
                    <td />
                    <th
                      scope="colgroup"
                      colSpan={3}
                      className="text-muted-foreground pb-0.5 text-[11px] font-semibold"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" aria-hidden /> Revisão decidiu
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <th scope="col" className="w-[28%] pb-1 text-left align-bottom">
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-semibold">
                        <Sparkles className="h-3 w-3" aria-hidden /> IA disse
                      </span>
                    </th>
                    {NIVEIS.map((revisao) => (
                      <th
                        key={revisao}
                        scope="col"
                        className="font-heading pb-1 align-bottom text-[11px] leading-tight font-bold"
                      >
                        {nivelLabel(revisao)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NIVEIS.map((ia) => (
                    <tr key={ia}>
                      <th
                        scope="row"
                        className="font-heading pr-1 text-left text-[11px] leading-tight font-bold"
                      >
                        {nivelLabel(ia)}
                      </th>
                      {NIVEIS.map((revisao) => {
                        const n = total(ia, revisao);
                        const cor = passo(n, maximo);
                        const diagonal = ia === revisao;
                        const descricao = `IA: ${nivelLabel(ia)}. Revisão: ${nivelLabel(revisao)}. ${plural(n)}${comparados ? `, ${porcentagem(n, comparados)}% dos revisados` : ""}.`;
                        return (
                          <td key={revisao} className="relative p-0">
                            <button
                              type="button"
                              aria-label={descricao}
                              onMouseEnter={() => setFoco({ ia, revisao })}
                              onMouseLeave={() => setFoco(null)}
                              onFocus={() => setFoco({ ia, revisao })}
                              onBlur={() => setFoco(null)}
                              className={cn(
                                "font-heading flex aspect-[4/3] w-full flex-col items-center justify-center rounded-xl text-lg font-black transition-transform outline-none hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#0a3d4a]",
                                !cor && "bg-background text-muted-foreground/60 font-semibold",
                                diagonal && "shadow-[inset_0_0_0_2px_rgba(10,61,74,0.35)]",
                              )}
                              style={cor ? { background: cor.fundo, color: cor.texto } : undefined}
                            >
                              {carregando ? "" : n}
                              {diagonal && !carregando && (
                                <span className="text-[9px] font-semibold tracking-wide uppercase opacity-80">
                                  manteve
                                </span>
                              )}
                            </button>
                            {foco?.ia === ia && foco.revisao === revisao && !carregando && (
                              <div
                                role="tooltip"
                                className={cn(
                                  "pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-52 rounded-xl bg-[#0a3d4a] px-3 py-2 text-left text-xs text-white shadow-lg",
                                  // Nas pontas, o balão cresce para dentro do card.
                                  revisao === 1 && "left-0",
                                  revisao === 2 && "left-1/2 -translate-x-1/2",
                                  revisao === 3 && "right-0",
                                )}
                              >
                                <div className="font-heading font-bold">
                                  {diagonal
                                    ? `Revisão manteve ${nivelLabel(ia)}`
                                    : `IA: ${nivelLabel(ia)} → Revisão: ${nivelLabel(revisao)}`}
                                </div>
                                <div className="text-white/75">
                                  {plural(n)} · {porcentagem(n, comparados)}% dos revisados
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <span>Menos</span>
              <span className="flex overflow-hidden rounded-full">
                {RAMPA.map((r) => (
                  <span key={r.fundo} className="h-2 w-5" style={{ background: r.fundo }} />
                ))}
              </span>
              <span>Mais</span>
            </div>

            {!carregando && (
              <p className="bg-background rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed">
                {fraseDosErros(matriz)}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
