"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import type { Usuario } from "@/types/usuario";

type ResetarSenhaUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario;
  senhaTemporaria: string;
};

/**
 * Porta Design/'s ResetPasswordModal — gera uma senha temporária (só
 * teatro de UI, sem back-end de auth pra isso ainda, igual o mock). A
 * senha é gerada pelo chamador (evento de clique, não durante o render —
 * ver gerar-senha.ts) e só passada como prop aqui.
 */
export function ResetarSenhaUsuarioDialog({
  open,
  onOpenChange,
  usuario,
  senhaTemporaria,
}: ResetarSenhaUsuarioDialogProps) {
  const [enviado, setEnviado] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setEnviado(false);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Uma senha temporária será gerada para <strong>{usuario.nome}</strong>. O usuário
            precisará trocá-la no próximo acesso.
          </p>
          <div className="bg-background rounded-xl p-3.5 text-center">
            <div className="text-gray-3 font-heading mb-1.5 text-[11px] font-bold tracking-wide uppercase">
              Senha temporária
            </div>
            <div className="font-heading text-primary text-xl font-black tracking-wide">
              {senhaTemporaria}
            </div>
          </div>
          {enviado && (
            <Alert type="success" message={`Senha redefinida e enviada para ${usuario.email}!`} />
          )}
          <Button size="lg" onClick={() => setEnviado(true)}>
            <KeyRound className="h-4 w-4" /> Confirmar redefinição
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
