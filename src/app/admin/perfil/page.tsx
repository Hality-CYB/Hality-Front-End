"use client";

import { Mail, Key, Info, Pencil, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { AboutDialog } from "@/components/about-dialog";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { EditUsuarioDialog } from "@/components/edit-usuario-dialog";
import { useLogout } from "@/hooks/use-auth";
import { useUsuario, useAtualizarUsuario } from "@/hooks/use-usuarios";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";

type DialogAberto = "editar" | "senha" | "sobre" | null;

export default function AdminPerfilPage() {
  const sessao = useSessaoAtual();
  const { data: usuario } = useUsuario(sessao.id);
  const atualizar = useAtualizarUsuario();
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null);
  const logout = useLogout();

  const itens = [
    {
      Icon: Pencil,
      label: "Editar perfil",
      dialog: "editar" as const,
      bg: "bg-secondary",
      iconColor: "text-primary",
    },
    {
      Icon: Key,
      label: "Alterar senha",
      dialog: "senha" as const,
      bg: "bg-[#FEF3C7]",
      iconColor: "text-[#F59E0B]",
    },
    {
      Icon: Info,
      label: "Sobre",
      dialog: "sobre" as const,
      bg: "bg-background",
      iconColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole nome={sessao.nome} size={72} role="admin" className="mb-2.5" />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">{sessao.nome}</div>
        <div className="mb-2 text-sm text-white/55">{sessao.email}</div>
        <StatusBadge label="Administrador" status="danger" />
      </div>

      <div className="-mt-5 flex flex-col gap-3.5 px-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          {[
            { label: "Função", valor: "Administrador do sistema" },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail
                </span>
              ),
              valor: sessao.email,
            },
            ...(usuario?.criadoEm
              ? [
                  {
                    label: "Acesso desde",
                    valor: new Date(usuario.criadoEm).toLocaleDateString("pt-BR"),
                  },
                ]
              : []),
          ].map((f, i, arr) => (
            <div
              key={typeof f.label === "string" ? f.label : i}
              className={`flex items-center justify-between py-3 text-sm ${
                i < arr.length - 1 ? "border-border border-b" : ""
              }`}
            >
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-heading font-semibold">{f.valor}</span>
            </div>
          ))}
        </Card>

        <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          {itens.map(({ Icon, label, dialog, bg, iconColor }, i) => (
            <button
              key={label}
              onClick={() => setDialogAberto(dialog)}
              className={`flex w-full items-center gap-3.5 p-4 text-left ${
                i < itens.length - 1 ? "border-border border-b" : ""
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

      {usuario && (
        <EditUsuarioDialog
          open={dialogAberto === "editar"}
          onOpenChange={(open) => setDialogAberto(open ? "editar" : null)}
          usuario={usuario}
          titulo="Editar perfil"
          salvando={atualizar.isPending}
          onSave={(v) =>
            atualizar.mutate({ id: usuario.id, ...v }, { onSuccess: () => setDialogAberto(null) })
          }
        />
      )}
      <ChangePasswordDialog
        open={dialogAberto === "senha"}
        onOpenChange={(open) => setDialogAberto(open ? "senha" : null)}
      />
      <AboutDialog
        open={dialogAberto === "sobre"}
        onOpenChange={(open) => setDialogAberto(open ? "sobre" : null)}
      />
    </div>
  );
}
