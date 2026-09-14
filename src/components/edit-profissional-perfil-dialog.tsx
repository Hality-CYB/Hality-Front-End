"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PerfilProfissional = {
  nome: string;
  email: string;
  especialidade: string;
  registro: string;
};

type EditProfissionalPerfilDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PerfilProfissional;
  onSave: (v: PerfilProfissional) => void;
};

const CAMPOS: { chave: keyof PerfilProfissional; label: string; type?: string }[] = [
  { chave: "nome", label: "Nome" },
  { chave: "email", label: "E-mail", type: "email" },
  { chave: "especialidade", label: "Especialidade" },
  { chave: "registro", label: "Registro" },
];

/** Porta Design/'s EditProfileModal (ProfessionalApp) — só o profissional tem esses campos (especialidade/registro). */
export function EditProfissionalPerfilDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: EditProfissionalPerfilDialogProps) {
  const [valores, setValores] = useState<PerfilProfissional>(initial);

  function handleOpenChange(next: boolean) {
    if (next) setValores(initial);
    onOpenChange(next);
  }

  const podeSalvar = valores.nome.trim().length > 0 && valores.email.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          {CAMPOS.map(({ chave, label, type }) => (
            <div key={chave}>
              <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
                {label}
              </label>
              <input
                type={type}
                value={valores[chave]}
                onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
              />
            </div>
          ))}
          <Button size="lg" disabled={!podeSalvar} onClick={() => onSave(valores)}>
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
