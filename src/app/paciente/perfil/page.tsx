"use client";

import { useState } from "react";
import { User, Mail, Phone, Key, Shield, Info, ChevronRight, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useLogout } from "@/hooks/use-auth";

// TODO: substituir por dados reais do usuário logado (ver TODO em avaliacao/page.tsx)
const USUARIO_PLACEHOLDER = {
  nome: "Ana Paula Ferreira",
  email: "ana@email.com",
  telefone: "(11) 99999-1234",
};

const ITENS_CONFIGURACAO = [
  {
    Icon: Key,
    label: "Alterar senha",
    sub: "Atualizar credenciais de acesso",
    dialog: "senha" as const,
  },
  {
    Icon: Shield,
    label: "Privacidade",
    sub: "Política e dados pessoais",
    dialog: "privacidade" as const,
  },
  { Icon: Info, label: "Sobre", sub: "Equipe e desenvolvimento do app", dialog: "sobre" as const },
];

export default function PerfilPage() {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(USUARIO_PLACEHOLDER.nome);
  const [telefone, setTelefone] = useState(USUARIO_PLACEHOLDER.telefone);
  const [dialogAberto, setDialogAberto] = useState<"senha" | "privacidade" | "sobre" | null>(null);
  const logout = useLogout();

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole nome={nome} size={72} className="mb-2.5" />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">{nome}</div>
        <div className="text-sm text-white/55">{USUARIO_PLACEHOLDER.email}</div>
      </div>

      <div className="mt-6 flex flex-col gap-3.5 px-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Dados pessoais</h2>
            <Button variant="secondary" size="sm" onClick={() => setEditing((e) => !e)}>
              {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <User className="text-gray-3 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Nome
                </div>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={!editing}
                  className="w-full bg-transparent text-[15px] outline-none disabled:opacity-100"
                />
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Mail className="text-gray-3 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  E-mail
                </div>
                <div className="text-[15px]">{USUARIO_PLACEHOLDER.email}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Phone className="text-gray-3 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Telefone
                </div>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={!editing}
                  className="w-full bg-transparent text-[15px] outline-none disabled:opacity-100"
                />
              </div>
            </div>
          </div>
          {editing && (
            <Button className="mt-4 w-full" onClick={() => setEditing(false)}>
              Salvar alterações
            </Button>
          )}
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
        open={dialogAberto === "privacidade"}
        onOpenChange={(open) => !open && setDialogAberto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacidade</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Consentimentos LGPD (RNF02) — tratamento de dados e treinamento de IA, separados e
            revogáveis.
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
