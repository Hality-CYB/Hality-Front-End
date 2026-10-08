"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { cn } from "@/lib/utils";

export type DadosProfissionais = {
  registro: string;
  especialidade: string;
  vinculadoHality: boolean;
};

type EditDadosProfissionaisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DadosProfissionais;
  onSave: (v: DadosProfissionais) => void;
  salvando?: boolean;
  erro?: string | null;
};

/** Dados do profissional que só o admin edita (`PATCH /admin/profissionais/{id}`). */
export function EditDadosProfissionaisDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  salvando = false,
  erro,
}: EditDadosProfissionaisDialogProps) {
  const [valores, setValores] = useState(initial);

  function handleOpenChange(next: boolean) {
    if (next) setValores(initial);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dados profissionais</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          {(
            [
              { chave: "registro", label: "Registro profissional" },
              { chave: "especialidade", label: "Especialidade" },
            ] as const
          ).map(({ chave, label }) => (
            <div key={chave}>
              <label
                htmlFor={`profissional-${chave}`}
                className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold"
              >
                {label}
              </label>
              <input
                id={`profissional-${chave}`}
                value={valores[chave]}
                onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-sm font-bold">Vinculado à Hality</div>
              <div className="text-muted-foreground text-xs">
                Profissional da rede parceira da Hality
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={valores.vinculadoHality}
              aria-label="Vinculado à Hality"
              onClick={() => setValores((v) => ({ ...v, vinculadoHality: !v.vinculadoHality }))}
              className={cn(
                "flex h-5.5 w-9.5 shrink-0 items-center rounded-full p-0.5 transition-colors",
                valores.vinculadoHality ? "bg-primary justify-end" : "justify-start bg-gray-300",
              )}
            >
              <div className="h-4.5 w-4.5 rounded-full bg-white shadow" />
            </button>
          </div>
          {erro && <Alert type="error" message={erro} />}
          <Button size="lg" disabled={salvando} onClick={() => onSave(valores)}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
