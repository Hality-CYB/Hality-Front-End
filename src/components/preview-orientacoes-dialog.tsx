"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { Lightbulb } from "lucide-react";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import type { Dica } from "@/types/dica";
import type { DiagnosticoNivel } from "@/types/diagnostico";

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

type PreviewOrientacoesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dicas: Dica[];
};

/** Porta Design/'s OrientationsPreviewModal — orientações que o paciente vê por classificação. */
export function PreviewOrientacoesDialog({
  open,
  onOpenChange,
  dicas,
}: PreviewOrientacoesDialogProps) {
  const [nivel, setNivel] = useState<DiagnosticoNivel>(1);
  const dicasNivel = dicas
    .filter((d) => d.publicado && d.niveis.includes(nivel))
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview — Orientações por classificação</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-xs">
            Assim aparecem as orientações pro paciente depois do diagnóstico, de acordo com a
            classificação.
          </p>
          <div className="flex gap-2">
            {NIVEIS.map((n) => {
              const cor = nivelColor(n);
              const ativo = nivel === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNivel(n)}
                  className="font-heading flex-1 rounded-[10px] border-[1.5px] px-1.5 py-2 text-center text-[11px] font-bold"
                  style={{
                    borderColor: ativo ? cor : "var(--border)",
                    background: ativo ? `${cor}18` : "#fff",
                    color: ativo ? cor : "var(--gray-text)",
                  }}
                >
                  {nivelLabel(n)}
                </button>
              );
            })}
          </div>
          {dicasNivel.length === 0 ? (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nenhuma orientação"
              description="Nenhuma dica publicada está marcada pra essa classificação ainda."
            />
          ) : (
            dicasNivel.map((dica) => (
              <TipCard
                key={dica.id}
                titulo={dica.titulo}
                categoria={dica.categoria}
                corpo={dica.corpo}
                formato={dica.formato}
                midiaUrl={dica.midiaUrl}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
