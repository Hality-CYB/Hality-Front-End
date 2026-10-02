"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  IdCard,
  Stethoscope,
  Pencil,
  Key,
  Info,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { AboutDialog } from "@/components/about-dialog";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import {
  EditProfissionalPerfilDialog,
  type PerfilProfissional,
} from "@/components/edit-profissional-perfil-dialog";
import { useLogout } from "@/hooks/use-auth";
import { useAtualizarPerfil, useUsuarioAtual } from "@/hooks/use-usuarios";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";

const ITENS_CONFIGURACAO = [
  {
    Icon: Pencil,
    label: "Editar perfil",
    sub: "Nome, telefone, especialidade e registro",
    dialog: "editar" as const,
    bg: "bg-secondary",
    iconColor: "text-primary",
  },
  {
    Icon: Key,
    label: "Alterar senha",
    sub: "Atualizar credenciais de acesso",
    dialog: "senha" as const,
    bg: "bg-[#FEF3C7]",
    iconColor: "text-[#F59E0B]",
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

export default function ProfissionalPerfilPage() {
  const sessao = useSessaoAtual();
  const { data: usuario } = useUsuarioAtual();
  const atualizarPerfil = useAtualizarPerfil();
  const perfil: PerfilProfissional = {
    nome: usuario?.nome ?? sessao.nome,
    telefone: usuario?.telefone ?? "",
    especialidade: usuario?.perfilProfissional?.especialidade ?? "",
    registro: usuario?.perfilProfissional?.registro ?? "",
  };
  const email = usuario?.email ?? sessao.email;
  const [dialogAberto, setDialogAberto] = useState<"editar" | "senha" | "sobre" | null>(null);
  const logout = useLogout();

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole nome={perfil.nome} size={72} role="profissional" className="mb-2.5" />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">{perfil.nome}</div>
        <div className="text-sm text-white/55">{perfil.especialidade || "Profissional"}</div>
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
                <div className="text-[15px]">{email}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Phone className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Telefone
                </div>
                <div className="text-[15px]">{perfil.telefone || "Não informado"}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <IdCard className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Registro
                </div>
                <div className="text-[15px]">{perfil.registro || "Não informado"}</div>
              </div>
            </div>
            <div className="bg-background flex items-center gap-2.5 rounded-[13px] p-3.5">
              <Stethoscope className="text-gray-3 h-4 w-4 shrink-0" />
              <div>
                <div className="text-gray-3 font-heading mb-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Especialidade
                </div>
                <div className="text-[15px]">{perfil.especialidade || "Não informada"}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
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

      <EditProfissionalPerfilDialog
        open={dialogAberto === "editar"}
        onOpenChange={(open) => setDialogAberto(open ? "editar" : null)}
        initial={perfil}
        salvando={atualizarPerfil.isPending}
        erro={atualizarPerfil.isError ? "Não foi possível salvar o perfil. Tente novamente." : null}
        onSave={(v) =>
          atualizarPerfil.mutate(
            {
              nome: v.nome,
              telefone: v.telefone,
              profissional: { registro: v.registro, especialidade: v.especialidade },
            },
            { onSuccess: () => setDialogAberto(null) },
          )
        }
      />
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
