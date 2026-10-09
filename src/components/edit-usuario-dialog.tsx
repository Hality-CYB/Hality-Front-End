"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import type { Usuario } from "@/types/usuario";

type EditUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario;
  onSave: (v: { nome: string; telefone: string }) => void;
  salvando?: boolean;
  erro?: string | null;
  titulo?: string;
};

/**
 * Nome e telefone. O e-mail só aparece: nem `PATCH /users/me` nem
 * `PATCH /admin/usuarios/{id}` aceitam mudar e-mail (422).
 */
export function EditUsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onSave,
  salvando,
  erro,
  titulo = "Editar dados",
}: EditUsuarioDialogProps) {
  const [nome, setNome] = useState(usuario.nome);
  const [telefone, setTelefone] = useState(usuario.telefone ?? "");

  function handleOpenChange(next: boolean) {
    if (next) {
      setNome(usuario.nome);
      setTelefone(usuario.telefone ?? "");
    }
    onOpenChange(next);
  }

  const podeSalvar = nome.trim().length >= 2 && !salvando;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div>
            <label
              htmlFor="editar-nome"
              className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold"
            >
              Nome
            </label>
            <input
              id="editar-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="editar-telefone"
              className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold"
            >
              Telefone
            </label>
            <input
              id="editar-telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div className="text-muted-foreground text-xs">
            E-mail: <span className="font-heading font-semibold">{usuario.email}</span> (não pode
            ser alterado)
          </div>
          {erro && <Alert type="error" message={erro} />}
          <Button
            size="lg"
            disabled={!podeSalvar}
            onClick={() => onSave({ nome: nome.trim(), telefone: telefone.trim() })}
          >
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
