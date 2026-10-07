"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { cn } from "@/lib/utils";

/** Mesmo mínimo do back (`SENHA_TAMANHO_MINIMO`). */
const SENHA_TAMANHO_MINIMO = 8;

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (senhas: { senhaAtual: string; novaSenha: string }) => void;
  salvando?: boolean;
  salvo?: boolean;
  erro?: string | null;
  /** Chamado ao fechar, pra quem chama limpar o estado da troca. */
  onReset?: () => void;
};

/**
 * Porta Design/'s ChangePasswordModal — home única, compartilhada entre os
 * perfis. A troca em si (`PATCH /users/me/senha`) fica com quem abre o dialog.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSalvar,
  salvando = false,
  salvo = false,
  erro = null,
  onReset,
}: ChangePasswordDialogProps) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const naoCoincidem = confirmar.length > 0 && nova !== confirmar;
  const podeSalvar =
    atual.length > 0 && nova.length >= SENHA_TAMANHO_MINIMO && nova === confirmar && !salvando;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAtual("");
      setNova("");
      setConfirmar("");
      onReset?.();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Senha atual
            </label>
            <input
              type="password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              placeholder="Digite sua senha atual"
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Nova senha
            </label>
            <input
              type="password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              placeholder={`Mínimo ${SENHA_TAMANHO_MINIMO} caracteres`}
              className="border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-heading mb-1.5 block text-xs font-bold tracking-wide uppercase">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              className={cn(
                "w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none",
                naoCoincidem ? "border-[#DC2626]" : "border-border",
              )}
            />
            {naoCoincidem && (
              <span className="mt-1 block text-xs text-[#DC2626]">As senhas não coincidem.</span>
            )}
          </div>
          {salvo && <Alert type="success" message="Senha atualizada." />}
          {erro && <Alert type="error" message={erro} />}
          <Button
            size="lg"
            disabled={!podeSalvar}
            onClick={() => onSalvar({ senhaAtual: atual, novaSenha: nova })}
          >
            {salvando ? "Atualizando…" : "Atualizar senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
