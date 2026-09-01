"use client";

import { useState } from "react";
import { Mail, IdCard, Stethoscope, Key, Info, ChevronRight, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useLogout } from "@/hooks/use-auth";

const PROFISSIONAL_PLACEHOLDER = {
  nome: "Dra. Ana Beatriz Costa",
  email: "prof@hality.com",
  registro: "CRO-SP 123456",
  especialidade: "Odontologia",
};

const ITENS_CONFIGURACAO = [
  {
    Icon: Key,
    label: "Alterar senha",
    sub: "Atualizar credenciais de acesso",
    dialog: "senha" as const,
  },
  { Icon: Info, label: "Sobre", sub: "Equipe e desenvolvimento do app", dialog: "sobre" as const },
];

export default function ProfissionalPerfilPage() {
  const [dialogAberto, setDialogAberto] = useState<"senha" | "sobre" | null>(null);
  const logout = useLogout();

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole
          nome={PROFISSIONAL_PLACEHOLDER.nome}
          size={72}
          role="profissional"
          className="mb-2.5"
        />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">
          {PROFISSIONAL_PLACEHOLDER.nome}
        </div>
        <div className="text-sm text-white/55">{PROFISSIONAL_PLACEHOLDER.especialidade}</div>
      </div>

      <div className="mt-6 flex flex-col gap-3.5 px-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <h2 className="mb-4 text-lg">Dados profissionais</h2>
          <div className="flex flex-col gap-2.5">
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Mail className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  E-mail
                </div>
                <div className="text-[15px]">{PROFISSIONAL_PLACEHOLDER.email}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <IdCard className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Registro
                </div>
                <div className="text-[15px]">{PROFISSIONAL_PLACEHOLDER.registro}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Stethoscope className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Especialidade
                </div>
                <div className="text-[15px]">{PROFISSIONAL_PLACEHOLDER.especialidade}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          {ITENS_CONFIGURACAO.map(({ Icon, label, sub, dialog }, i) => (
            <button
              key={label}
              onClick={() => setDialogAberto(dialog)}
              className={`flex w-full items-center gap-3.5 p-4 text-left ${
                i < ITENS_CONFIGURACAO.length - 1 ? "border-border border-b" : ""
              }`}
            >
              <div className="bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
                <Icon className="text-primary h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">{label}</div>
                <div className="text-muted-foreground text-xs">{sub}</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </button>
          ))}
        </Card>

        <Button
          variant="danger"
          className="w-full"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4.5 w-4.5" /> Sair da conta
        </Button>
        <div className="h-2" />
      </div>

      <Dialog
        open={dialogAberto === "senha"}
        onOpenChange={(open) => !open && setDialogAberto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Formulário fica pra quando houver back-end de auth de verdade.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialogAberto === "sobre"}
        onOpenChange={(open) => !open && setDialogAberto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sobre</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Check Your Breath — equipe AGES.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
