"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuarios } from "@/hooks/use-usuarios";
import { cn } from "@/lib/utils";
import type { Usuario } from "@/types/usuario";

type VincularProfissionalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Usuario;
  vinculadoAtualId?: string;
  onVincular: (profissionalId: string) => void;
  salvando?: boolean;
};

/** Porta Design/'s LinkProfessionalModal (RF05 — admin vincula paciente a um profissional). */
export function VincularProfissionalDialog({
  open,
  onOpenChange,
  paciente,
  vinculadoAtualId,
  onVincular,
  salvando,
}: VincularProfissionalDialogProps) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState(vinculadoAtualId ?? "");
  const { data: usuarios } = useUsuarios();

  const profissionais = (usuarios ?? []).filter(
    (u) => u.role === "profissional" && u.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular profissional</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Escolha o profissional responsável por <strong>{paciente.nome}</strong>.
          </p>
          <div className="relative">
            <Search className="text-gray-3 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar profissional..."
              className="bg-background w-full rounded-xl border-[1.5px] border-transparent py-2.75 pr-3.5 pl-10 text-sm outline-none"
            />
          </div>
          <div className="flex max-h-70 flex-col gap-2 overflow-y-auto">
            {profissionais.length === 0 && (
              <span className="text-muted-foreground text-sm">Nenhum profissional encontrado.</span>
            )}
            {profissionais.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelecionadoId(p.id)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left",
                  selecionadoId === p.id ? "border-primary bg-secondary" : "border-border bg-card",
                )}
              >
                <AvatarWithRole nome={p.nome} size={34} role="profissional" />
                <div className="flex-1">
                  <div className="font-heading text-sm font-bold">{p.nome}</div>
                  <div className="text-muted-foreground text-xs">Profissional</div>
                </div>
                {selecionadoId === p.id && <Check className="text-primary h-4 w-4" />}
              </button>
            ))}
          </div>
          <Button
            size="lg"
            disabled={!selecionadoId || salvando}
            onClick={() => onVincular(selecionadoId)}
          >
            Vincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
