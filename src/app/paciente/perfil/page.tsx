"use client";

import { useState } from "react";
import { User, Mail, Phone, Key, Shield, Info, ChevronRight, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { AboutDialog } from "@/components/about-dialog";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { PrivacyDialog } from "@/components/privacy-dialog";
import { useLogout } from "@/hooks/use-auth";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";

// Telefone não existe em types/usuario.ts ainda (só id/nome/email/role) —
// segue local-only como já era em Design/'s Profile (useState hardcoded).
const TELEFONE_PLACEHOLDER = "(11) 99999-1234";

const ITENS_CONFIGURACAO = [
  {
    Icon: Key,
    label: "Alterar senha",
    sub: "Atualizar credenciais de acesso",
    dialog: "senha" as const,
    bg: "bg-secondary",
    iconColor: "text-primary",
  },
  {
    Icon: Shield,
    label: "Privacidade",
    sub: "Política e dados pessoais",
    dialog: "privacidade" as const,
    bg: "bg-[#D1FAE5]",
    iconColor: "text-[#16A34A]",
  },
  {
    Icon: Info,
    label: "Sobre",
    sub: "Equipe e desenvolvimento do app",
    dialog: "sobre" as const,
    bg: "bg-background",
    iconColor: "text-muted-foreground",
  },
];

export default function PerfilPage() {
  const sessao = useSessaoAtual();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(sessao.nome);
  const [telefone, setTelefone] = useState(TELEFONE_PLACEHOLDER);
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
        <div className="text-sm text-white/55">{sessao.email}</div>
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
            <div
              className={cn(
                "bg-background flex items-center gap-2.5 rounded-[13px] border-[1.5px] p-3.5 transition-colors",
                editing ? "border-primary" : "border-transparent",
              )}
            >
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
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-transparent p-3.5">
              <Mail className="text-gray-3 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  E-mail
                </div>
                <div className="text-[15px]">{sessao.email}</div>
              </div>
            </div>
            <div
              className={cn(
                "bg-background flex items-center gap-2.5 rounded-[13px] border-[1.5px] p-3.5 transition-colors",
                editing ? "border-primary" : "border-transparent",
              )}
            >
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
          {ITENS_CONFIGURACAO.map(({ Icon, label, sub, dialog, bg, iconColor }, i) => (
            <button
              key={label}
              onClick={() => setDialogAberto(dialog)}
              className={`flex w-full items-center gap-3.5 p-4 text-left ${
                i < ITENS_CONFIGURACAO.length - 1 ? "border-border border-b" : ""
              }`}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                  bg,
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", iconColor)} />
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

      <ChangePasswordDialog
        open={dialogAberto === "senha"}
        onOpenChange={(open) => setDialogAberto(open ? "senha" : null)}
      />
      <PrivacyDialog
        open={dialogAberto === "privacidade"}
        onOpenChange={(open) => setDialogAberto(open ? "privacidade" : null)}
        onExcluirConta={() => logout.mutate()}
      />
      <AboutDialog
        open={dialogAberto === "sobre"}
        onOpenChange={(open) => setDialogAberto(open ? "sobre" : null)}
      />
    </div>
  );
}
