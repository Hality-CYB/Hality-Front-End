"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { cn } from "@/lib/utils";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Porta Design/'s ChangePasswordModal (byte-idêntico em PatientApp/
 * ProfessionalApp/AdminApp) — home única, compartilhada entre os 3 perfis.
 * Sem chamada real ainda: não existe rota de auth pra troca de senha no
 * back-end (só login/registro/logout em app/api/auth/*), então fica local
 * como no mock até essa rota existir.
 */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvo, setSalvo] = useState(false);

  const naoCoincidem = confirmar.length > 0 && nova !== confirmar;
  const podeSalvar = atual.length > 0 && nova.length >= 6 && nova === confirmar;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAtual("");
      setNova("");
      setConfirmar("");
      setSalvo(false);
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
              placeholder="Mínimo 6 caracteres"
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
          {salvo && <Alert type="success" message="Senha atualizada com sucesso!" />}
          <Button size="lg" disabled={!podeSalvar} onClick={() => setSalvo(true)}>
            Atualizar senha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
