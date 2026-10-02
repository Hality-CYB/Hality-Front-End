"use client";

import { useState, createElement, type ReactNode } from "react";
import Link from "next/link";
import {
  Sparkles,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LevelChip } from "@/components/level-chip";
import { StatusBadge } from "@/components/status-badge";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { nivelColor, nivelLabel, nivelIcon, type BadgeStatus } from "@/lib/level-format";
import { formatarResposta } from "@/lib/anamnese-format";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Diagnostico, DiagnosticoNivel } from "@/types/diagnostico";

export const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

/** O back devolve um caminho da própria API; uma URL absoluta (ex.: CDN) é usada como veio. */
function urlDaImagem(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${config.apiBaseUrl}${url}`;
}

const ABAS = [
  { valor: "detalhes", label: "Detalhes" },
  { valor: "orientacoes", label: "Orientações" },
] as const;

type DiagnosticoDetalheProps = {
  diagnostico: Diagnostico;
  titulo: string;
  subtitulo: string;
  status: { label: string; tipo: BadgeStatus };
  /** Mostra o avatar ao lado do título (profissional vendo um paciente). */
  avatarNome?: string;
  voltarHref?: string;
  /** Entra na leitura da IA, abaixo do nível (ex.: aviso de revisão para o paciente). */
  aviso?: ReactNode;
  /** Cards extras depois da anamnese (ex.: avaliação do profissional). */
  children?: ReactNode;
};

/**
 * Detalhe de um diagnóstico, compartilhado entre paciente e profissional.
 * No desktop, foto e leitura da IA formam uma superfície só; no mobile, ficam empilhadas.
 */
export function DiagnosticoDetalhe({
  diagnostico,
  titulo,
  subtitulo,
  status,
  avatarNome,
  voltarHref,
  aviso,
  children,
}: DiagnosticoDetalheProps) {
  const [aba, setAba] = useState<"detalhes" | "orientacoes">("detalhes");
  const [anamneseAberta, setAnamneseAberta] = useState(false);

  const nivel = diagnostico.nivel;
  // Quando o profissional muda o nível da IA, o dele vira o resultado em destaque.
  const nivelProfissional =
    diagnostico.revisao?.revisado && diagnostico.revisao.nivelCorrigido
      ? diagnostico.revisao.nivel
      : null;
  const nivelDestaque = nivelProfissional ?? nivel;
  const conteudos = diagnostico.conteudos ?? [];
  const analise = nivel ? conteudos[0] : undefined;
  const [fotoFalhou, setFotoFalhou] = useState(false);
  const fotoUrl = diagnostico.imagemUrl && !fotoFalhou ? urlDaImagem(diagnostico.imagemUrl) : null;

  return (
    <div className="flex flex-col">
      <div className="relative p-5 pb-4" style={{ background: "var(--gradient-brand)" }}>
        {voltarHref && (
          <Link
            href={voltarHref}
            className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        )}
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatarNome && <AvatarWithRole nome={avatarNome} size={44} />}
            <div className="min-w-0">
              <h1 className="mb-0.5 truncate text-xl text-white">{titulo}</h1>
              <p className="text-sm text-white/60">{subtitulo}</p>
            </div>
          </div>
          <StatusBadge className="shrink-0" label={status.label} status={status.tipo} />
        </div>

        <div className="flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
          {ABAS.map(({ valor, label }) => (
            <button
              key={valor}
              onClick={() => setAba(valor)}
              className={cn(
                "font-heading flex-1 rounded-[9px] px-1.5 py-2.25 text-[13px] font-bold transition-all",
                aba === valor
                  ? "text-primary bg-white shadow-md"
                  : "text-white/65 hover:text-white/90",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {aba === "detalhes" && (
          <div className="flex flex-col gap-3.5">
            <div className="shell:grid shell:grid-cols-[1.15fr_1fr] shell:gap-0 shell:overflow-hidden shell:rounded-lg shell:bg-card shell:shadow-sm flex flex-col gap-3.5">
              <Card
                className="shell:rounded-none shell:border-0 shell:shadow-none shell:p-7 rounded-lg border border-[rgba(11,107,130,0.12)] p-5 shadow-sm ring-0"
                style={{
                  background: "linear-gradient(135deg,rgba(11,107,130,0.05),rgba(22,163,74,0.04))",
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary text-primary flex h-8 w-8 items-center justify-center rounded-[9px]">
                      {nivelProfissional ? (
                        <Stethoscope className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div className="font-heading text-primary text-sm font-extrabold">
                      {nivelProfissional ? "Resultado do profissional" : "Resultado da IA"}
                    </div>
                  </div>
                  {nivelProfissional && nivel && (
                    <div
                      className="border-border bg-card/70 text-muted-foreground flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                      title="Classificação original da IA, antes da revisão"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>
                        IA: <span style={{ color: nivelColor(nivel) }}>{nivelLabel(nivel)}</span>
                        {diagnostico.confiancaIA !== undefined && ` · ${diagnostico.confiancaIA}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px]"
                    style={{ background: `${nivelColor(nivelDestaque)}18` }}
                  >
                    {createElement(nivelIcon(nivelDestaque), {
                      className: "h-7 w-7",
                      style: { color: nivelColor(nivelDestaque) },
                    })}
                  </div>
                  <div>
                    <LevelChip nivel={nivelDestaque} />
                    {nivelProfissional && (
                      <div className="text-muted-foreground mt-1.5 text-xs">
                        Revisado por{" "}
                        {diagnostico.revisao?.profissionalNome ?? "profissional Hality"}
                      </div>
                    )}
                    {!nivelProfissional && diagnostico.confiancaIA !== undefined && (
                      <>
                        <div className="text-muted-foreground mt-1.5 mb-1.5 text-xs">
                          Confiança: {diagnostico.confiancaIA}%
                        </div>
                        <div className="bg-secondary h-1.25 w-30 overflow-hidden rounded-4xl">
                          <div
                            className="bg-primary h-full rounded-4xl"
                            style={{ width: `${diagnostico.confiancaIA}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {aviso && <div className="mt-4">{aviso}</div>}

                {nivelDestaque && (
                  <div className="shell:block mt-6 hidden">
                    <div className="text-muted-foreground mb-2 text-xs font-semibold">
                      Onde a classificação está na escala
                    </div>
                    <div className="flex gap-1.5">
                      {NIVEIS.map((l) => {
                        const atual = nivelDestaque === l;
                        return (
                          <div key={l} className="flex-1">
                            <div
                              className={cn("h-2 rounded-full", !atual && "bg-border")}
                              style={atual ? { background: nivelColor(l) } : undefined}
                            />
                            <div
                              className={cn(
                                "mt-1.5 text-[11px] leading-tight",
                                atual ? "font-heading font-bold" : "text-muted-foreground",
                              )}
                              style={atual ? { color: nivelColor(l) } : undefined}
                            >
                              {nivelLabel(l)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analise && (
                  <div className="border-border shell:mt-6 mt-4 border-t pt-4">
                    <div className="font-heading mb-1.5 text-[13px] font-bold">Análise</div>
                    {analise.textos.map((texto, i) => (
                      <p key={i} className="text-muted-foreground text-[13px] leading-relaxed">
                        {texto}
                      </p>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="shell:order-first shell:rounded-none shell:p-0 shell:shadow-none rounded-lg p-5 shadow-sm ring-0">
                <div className="font-heading shell:hidden mb-3 text-sm font-extrabold">
                  Imagem capturada
                </div>
                <div className="shell:h-full shell:rounded-none relative flex aspect-4/3 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#0a3d4a]">
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo back por path dinâmico, fora do domínio de otimização do next/image
                    <img
                      src={fotoUrl}
                      alt="Foto da língua capturada"
                      className="h-full w-full object-cover"
                      onError={() => setFotoFalhou(true)}
                    />
                  ) : (
                    <>
                      <ImageIcon className="h-9 w-9 text-white/20" />
                      <span className="text-xs text-white/30">
                        {fotoFalhou
                          ? "Imagem indisponível"
                          : `Imagem capturada · ${new Date(diagnostico.criadoEm).toLocaleDateString("pt-BR")}`}
                      </span>
                    </>
                  )}
                </div>
              </Card>
            </div>

            <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
              <button
                onClick={() => setAnamneseAberta((o) => !o)}
                aria-expanded={anamneseAberta}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="font-heading text-sm font-extrabold">Anamnese</div>
                <ChevronRight
                  className={cn(
                    "text-gray-3 h-4 w-4 transition-transform",
                    anamneseAberta && "rotate-90",
                  )}
                />
              </button>
              {anamneseAberta && (
                <div className="shell:grid shell:grid-cols-2 flex flex-col gap-1.5 px-5 pb-5">
                  {diagnostico.respostasAnamnese?.map((r) => (
                    <div
                      key={r.perguntaId}
                      className="bg-background flex justify-between gap-3 rounded-[10px] px-3 py-2"
                    >
                      <span className="text-muted-foreground text-[13px]">{r.enunciado}</span>
                      <span className="font-heading shrink-0 text-[13px] font-semibold">
                        {formatarResposta(r.tipo, r.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {children}
          </div>
        )}

        {aba === "orientacoes" && (
          <div className="cyb-grid gap-3.5">
            {!nivel && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Ainda sem orientações"
                description="As orientações aparecem depois que o diagnóstico for classificado."
              />
            )}
            {nivel && conteudos.length === 0 && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7" />}
                title="Nenhuma orientação cadastrada"
                description="Ainda não há conteúdo cadastrado para essa classificação."
              />
            )}
            {conteudos.map((c) => (
              <TipCard
                key={c.id}
                titulo={c.titulo}
                categoria={c.categoria}
                corpo={c.textos.join(" ")}
                formato="texto"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
