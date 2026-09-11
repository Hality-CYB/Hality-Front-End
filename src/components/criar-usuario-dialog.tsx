"use client";

import { useState } from "react";
import { User, Stethoscope, Shield, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/usuario";

const OPCOES_ROLE: { valor: Role; label: string; Icon: typeof User; bg: string }[] = [
  { valor: "paciente", label: "Paciente", Icon: User, bg: "bg-secondary" },
  { valor: "profissional", label: "Profissional", Icon: Stethoscope, bg: "bg-[#DBEAFE]" },
  { valor: "admin", label: "Admin", Icon: Shield, bg: "bg-[#FEF3C7]" },
];

type CriarUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (v: { nome: string; email: string; role: Role }) => void;
  salvando?: boolean;
};

/** Porta Design/'s CreateUserModal — criar usuário é um modal a partir da lista, não uma rota própria. */
export function CriarUsuarioDialog({
  open,
  onOpenChange,
  onCreate,
  salvando,
}: CriarUsuarioDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("paciente");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNome("");
      setEmail("");
      setRole("paciente");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Nome completo
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário..."
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Tipo de usuário
            </label>
            <div className="flex flex-col gap-2">
              {OPCOES_ROLE.map(({ valor, label, Icon, bg }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setRole(valor)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left",
                    role === valor ? "border-primary bg-secondary" : "border-border bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px]",
                      bg,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-heading text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            disabled={!nome.trim() || !email.trim() || salvando}
            onClick={() => onCreate({ nome: nome.trim(), email: email.trim(), role })}
          >
            <Check className="h-4 w-4" /> Criar usuário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
