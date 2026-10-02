"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Usuario } from "@/types/usuario";

type EditUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario;
  onSave: (v: { nome: string; email: string }) => void;
  salvando?: boolean;
  titulo?: string;
};

/**
 * Porta Design/'s EditUserModal — só nome/e-mail (os campos que existem de
 * verdade em types/usuario.ts). Design/ também edita plano/status/
 * especialidade/registro ali, mas nenhum desses campos existe no nosso
 * schema ainda (AdminUser do mock tinha bem mais campo que o Usuario real).
 */
export function EditUsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onSave,
  salvando,
  titulo = "Editar dados",
}: EditUsuarioDialogProps) {
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);

  function handleOpenChange(next: boolean) {
    if (next) {
      setNome(usuario.nome);
      setEmail(usuario.email);
    }
    onOpenChange(next);
  }

  const podeSalvar = nome.trim().length > 0 && email.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Nome
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
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
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <Button
            size="lg"
            disabled={!podeSalvar || salvando}
            onClick={() => onSave({ nome: nome.trim(), email: email.trim() })}
          >
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
