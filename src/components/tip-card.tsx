"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Lightbulb,
  Droplet,
  HeartPulse,
  Apple,
  Clock,
  Sparkles,
  Salad,
  Stethoscope,
  Play,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ConteudoBlocos } from "@/components/conteudo-blocos";
import { urlDaApi } from "@/lib/url-da-api";
import { resumoDoConteudo, type BlocoConteudo } from "@/types/conteudo";

/**
 * Card de um conteúdo (dica da home, orientação do diagnóstico, preview do
 * admin). Na grade do desktop todos têm a mesma altura; no celular (uma
 * coluna) a altura é só limitada, para card curto não sobrar vazio. A mídia
 * ocupa um espaço fixo e o texto é cortado com "Ver mais". Clicar no card abre
 * o conteúdo inteiro num modal.
 *
 * "compact" reconcilia a divergência que existia em Design/ (3 versões
 * ligeiramente diferentes do TipCard): adotamos o padding condicional do
 * AdminApp como o comportamento único.
 */
type TipCardProps = {
  titulo: string;
  categoria: string;
  blocos: BlocoConteudo[];
  icon?: LucideIcon;
  compact?: boolean;
};

/** Mesmos códigos de `CategoriaConteudo` do back (app/models/conteudo.py). */
const CATEGORIA_INFO: Record<string, { label: string; icon: LucideIcon }> = {
  higiene: { label: "Higiene", icon: Droplet },
  saude: { label: "Saúde", icon: HeartPulse },
  nutricao: { label: "Nutrição", icon: Apple },
  rotina: { label: "Rotina", icon: Clock },
  estilo_de_vida: { label: "Estilo de vida", icon: Sparkles },
  dieta: { label: "Dieta", icon: Salad },
  tratamento: { label: "Tratamento", icon: Stethoscope },
  geral: { label: "Geral", icon: Lightbulb },
};

function infoDaCategoria(categoria: string): { label: string; icon: LucideIcon } {
  const conhecida = CATEGORIA_INFO[categoria.toLowerCase().trim()];
  if (conhecida) return conhecida;
  // Categoria fora do catálogo conhecido: só capitaliza a primeira letra em
  // vez de mostrar o código cru (ex.: "meio_ambiente" -> "Meio_ambiente").
  const bruta = categoria.trim();
  return { label: bruta.charAt(0).toUpperCase() + bruta.slice(1), icon: Lightbulb };
}

function ChipCategoria({ label }: { label: string }) {
  return (
    <span className="font-heading text-primary bg-secondary shrink-0 rounded-4xl px-2 py-0.5 text-[10px] font-semibold">
      {label}
    </span>
  );
}

export function TipCard({ titulo, categoria, blocos, icon, compact }: TipCardProps) {
  const { label: categoriaLabel, icon: categoriaIcon } = infoDaCategoria(categoria);
  const Icon = icon ?? categoriaIcon;
  const { midia, texto } = resumoDoConteudo(blocos);
  const [aberto, setAberto] = useState(false);
  const textoRef = useRef<HTMLParagraphElement>(null);
  const [cortado, setCortado] = useState(false);

  // "Ver mais" só quando o texto não coube; recalcula se o card mudar de largura.
  useLayoutEffect(() => {
    const el = textoRef.current;
    if (!el) return;
    const medir = () => setCortado(el.scrollHeight > el.clientHeight + 1);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [texto, midia]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        className={cn(
          "bg-card text-card-foreground shell:h-80 flex max-h-80 w-full flex-col gap-2.5 overflow-hidden rounded-lg text-left shadow-sm",
          "focus-visible:ring-ring/50 transition-shadow outline-none hover:shadow-md focus-visible:ring-3",
          compact ? "p-4" : "p-5",
        )}
      >
        <div className="flex w-full shrink-0 items-center gap-3">
          <div className="text-primary bg-secondary flex size-10 shrink-0 items-center justify-center rounded-[12px]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="font-heading line-clamp-1 text-sm font-bold">{titulo}</span>
            <ChipCategoria label={categoriaLabel} />
          </div>
        </div>

        {midia && (
          <div className="border-border relative h-32 w-full shrink-0 overflow-hidden rounded-xl border bg-black/5">
            {midia.tipo === "imagem" ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL cadastrada pelo admin, de qualquer domínio
              <img
                src={urlDaApi(midia.url)}
                alt={midia.alt ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                {/* No card o vídeo é só a capa; ele toca no modal. */}
                <video
                  src={urlDaApi(midia.url)}
                  preload="metadata"
                  muted
                  playsInline
                  aria-hidden
                  className="h-full w-full bg-black object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-white">
                    <Play className="h-5 w-5" aria-hidden />
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        <p
          ref={textoRef}
          className={cn(
            "text-muted-foreground min-h-0 w-full text-[13px] leading-relaxed whitespace-pre-line",
            midia ? "line-clamp-3" : "line-clamp-8",
          )}
        >
          {texto}
        </p>

        {(cortado || midia?.tipo === "video") && (
          <span className="font-heading text-primary mt-auto shrink-0 text-xs font-bold">
            {midia?.tipo === "video" && !cortado ? "Assistir" : "Ver mais"}
          </span>
        )}
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="shell:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{titulo}</DialogTitle>
            <div>
              <ChipCategoria label={categoriaLabel} />
            </div>
          </DialogHeader>
          <ConteudoBlocos blocos={blocos} />
        </DialogContent>
      </Dialog>
    </>
  );
}
