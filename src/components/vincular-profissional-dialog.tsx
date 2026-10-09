"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { cn } from "@/lib/utils";
import type { Usuario } from "@/types/usuario";

type VincularProfissionalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Usuario;
  /** Profissionais já filtrados pela busca (quem abre o dialog consulta o back). */
  profissionais: Usuario[];
  busca: string;
  onBuscaChange: (busca: string) => void;
  /** Profissionais com vínculo ativo — aparecem marcados e não podem ser escolhidos de novo. */
  jaVinculadosIds: string[];
  onVincular: (profissionalId: string) => void;
  salvando?: boolean;
  erro?: string | null;
};

/**
 * Porta Design/'s LinkProfessionalModal (RF05). No back um paciente pode ter
 * vários vínculos ativos, então isto cria um vínculo novo; não troca o atual.
 */
export function VincularProfissionalDialog({
  open,
  onOpenChange,
  paciente,
  profissionais,
  busca,
  onBuscaChange,
  jaVinculadosIds,
  onVincular,
  salvando,
  erro,
}: VincularProfissionalDialogProps) {
  const [selecionadoId, setSelecionadoId] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelecionadoId("");
      onBuscaChange("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular profissional</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Escolha um profissional para acompanhar <strong>{paciente.nome}</strong>.
          </p>
          <div className="relative">
            <Search className="text-gray-3 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar profissional..."
              aria-label="Buscar profissional"
              className="bg-background w-full rounded-xl border-[1.5px] border-transparent py-2.75 pr-3.5 pl-10 text-sm outline-none"
            />
          </div>
          <div className="flex max-h-70 flex-col gap-2 overflow-y-auto">
            {profissionais.length === 0 && (
              <span className="text-muted-foreground text-sm">Nenhum profissional encontrado.</span>
            )}
            {profissionais.map((p) => {
              const jaVinculado = jaVinculadosIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={jaVinculado}
                  onClick={() => setSelecionadoId(p.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left disabled:opacity-60",
                    selecionadoId === p.id
                      ? "border-primary bg-secondary"
                      : "border-border bg-card",
                  )}
                >
                  <AvatarWithRole nome={p.nome} size={34} role="profissional" />
                  <div className="flex-1">
                    <div className="font-heading text-sm font-bold">{p.nome}</div>
                    <div className="text-muted-foreground text-xs">
                      {jaVinculado
                        ? "Já vinculado"
                        : (p.perfilProfissional?.especialidade ?? "Profissional")}
                    </div>
                  </div>
                  {selecionadoId === p.id && <Check className="text-primary h-4 w-4" />}
                </button>
              );
            })}
          </div>
          {erro && <Alert type="error" message={erro} />}
          <Button
            size="lg"
            disabled={!selecionadoId || salvando}
            onClick={() => onVincular(selecionadoId)}
          >
            {salvando ? "Vinculando…" : "Vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
