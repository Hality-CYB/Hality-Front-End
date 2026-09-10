"use client";

import { useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrivacyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExcluirConta?: () => void;
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "flex h-5.5 w-9.5 shrink-0 items-center rounded-4xl p-0.5 transition-colors",
        on ? "bg-primary justify-end" : "justify-start bg-[#D1D5DB]",
      )}
    >
      <div className="h-4.5 w-4.5 rounded-full bg-white shadow" />
    </button>
  );
}

/**
 * Porta Design/'s PrivacyModal — só existe em PatientApp (não é
 * compartilhado com profissional/admin). Consentimentos LGPD (RNF02:
 * compartilhamento com profissionais e comunicações por e-mail). Exclusão
 * de conta confirma inline dentro do mesmo bottom sheet, igual Design —
 * Design/ nunca abre um segundo popup por cima do primeiro.
 */
export function PrivacyDialog({ open, onOpenChange, onExcluirConta }: PrivacyDialogProps) {
  const [compartilharComProfissionais, setCompartilharComProfissionais] = useState(true);
  const [comunicacoesEmail, setComunicacoesEmail] = useState(true);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmarExclusao(false);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacidade</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div className="bg-background flex items-center justify-between gap-3 rounded-xl p-3.5">
            <div>
              <div className="font-heading text-[13px] font-bold">
                Compartilhar com profissionais
              </div>
              <div className="text-muted-foreground text-xs">
                Permite que profissionais Hality vejam seus diagnósticos e anamnese
              </div>
            </div>
            <Toggle
              on={compartilharComProfissionais}
              onToggle={() => setCompartilharComProfissionais((v) => !v)}
            />
          </div>
          <div className="bg-background flex items-center justify-between gap-3 rounded-xl p-3.5">
            <div>
              <div className="font-heading text-[13px] font-bold">Comunicações por e-mail</div>
              <div className="text-muted-foreground text-xs">
                Dicas de saúde, novidades e lembretes
              </div>
            </div>
            <Toggle on={comunicacoesEmail} onToggle={() => setComunicacoesEmail((v) => !v)} />
          </div>

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-primary font-heading flex items-center gap-1.5 text-[13px] font-bold"
          >
            <FileText className="h-3.5 w-3.5" /> Ler política de privacidade
          </a>

          <div className="border-border flex flex-col gap-2.5 border-t pt-3.5">
            <Button variant="secondary">
              <Download className="h-4 w-4" /> Baixar meus dados
            </Button>
            {!confirmarExclusao ? (
              <Button variant="danger" onClick={() => setConfirmarExclusao(true)}>
                <Trash2 className="h-4 w-4 text-[#DC2626]" /> Excluir minha conta
              </Button>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3.5">
                <span className="text-[13px] leading-relaxed text-[#991B1B]">
                  Isso apaga permanentemente sua conta e seus diagnósticos. Tem certeza?
                </span>
                <div className="flex gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmarExclusao(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setConfirmarExclusao(false);
                      onExcluirConta?.();
                    }}
                  >
                    Confirmar exclusão
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
