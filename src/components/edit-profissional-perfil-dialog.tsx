"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PerfilProfissional = {
  nome: string;
  telefone: string;
  especialidade: string;
  registro: string;
};

type EditProfissionalPerfilDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PerfilProfissional;
  onSave: (v: PerfilProfissional) => void;
  salvando?: boolean;
  erro?: string | null;
};

const CAMPOS: { chave: keyof PerfilProfissional; label: string; type?: string }[] = [
  { chave: "nome", label: "Nome" },
  { chave: "telefone", label: "Telefone", type: "tel" },
  { chave: "especialidade", label: "Especialidade" },
  { chave: "registro", label: "Registro profissional" },
];

/** E-mail fica fora: o back não deixa o próprio usuário alterá-lo. */
export function EditProfissionalPerfilDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  salvando = false,
  erro,
}: EditProfissionalPerfilDialogProps) {
  const [valores, setValores] = useState<PerfilProfissional>(initial);

  function handleOpenChange(next: boolean) {
    if (next) setValores(initial);
    onOpenChange(next);
  }

  const podeSalvar = valores.nome.trim().length >= 2 && !salvando;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          {CAMPOS.map(({ chave, label, type }) => (
            <div key={chave}>
              <label
                htmlFor={`perfil-${chave}`}
                className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold"
              >
                {label}
              </label>
              <input
                id={`perfil-${chave}`}
                type={type}
                value={valores[chave]}
                onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
              />
            </div>
          ))}
          {erro && <p className="text-destructive text-[13px]">{erro}</p>}
          <Button size="lg" disabled={!podeSalvar} onClick={() => onSave(valores)}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
