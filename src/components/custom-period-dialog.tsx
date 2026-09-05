"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CustomRange } from "@/lib/date-period";

type CustomPeriodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CustomRange | null;
  onApply: (range: CustomRange) => void;
};

/**
 * Porta Design/'s CustomPeriodModal (byte-idêntico em PatientApp/
 * ProfessionalApp/AdminApp) — usado junto com o filtro de período de
 * lib/date-period.ts nas listas de diagnósticos/pacientes/usuários.
 */
export function CustomPeriodDialog({
  open,
  onOpenChange,
  initial,
  onApply,
}: CustomPeriodDialogProps) {
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Período personalizado</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Data início
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Data fim
            </label>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <Button size="lg" disabled={!start || !end} onClick={() => onApply({ start, end })}>
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
