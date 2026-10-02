"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  KeyRound,
  Link2,
  Ban,
  ChartColumn,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { EditUsuarioDialog } from "@/components/edit-usuario-dialog";
import { ResetarSenhaUsuarioDialog } from "@/components/resetar-senha-usuario-dialog";
import { VincularProfissionalDialog } from "@/components/vincular-profissional-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUsuario, useUsuarios, useAtualizarUsuario } from "@/hooks/use-usuarios";
import { usePaciente, useVincularProfissional } from "@/hooks/use-pacientes";
import { roleLabel, roleBadgeStatus } from "@/lib/role-format";
import { gerarSenhaTemporaria } from "@/lib/gerar-senha";
import { cn } from "@/lib/utils";

type DialogAberto = "editar" | "senha" | "vincular" | "bloquear" | null;

export default function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/admin/usuarios";
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState("");

  const { data: usuario } = useUsuario(id);
  const { data: usuarios } = useUsuarios();
  const { data: paciente } = usePaciente(id);
  const atualizar = useAtualizarUsuario();
  const vincular = useVincularProfissional();

  if (!usuario) return null;

  const isPaciente = usuario.role === "paciente";
  const profissionalVinculado = usuarios?.find((u) => u.id === paciente?.profissionalVinculadoId);
  const hrefAtual = `/admin/usuarios/${id}?voltar=${encodeURIComponent(voltarHref)}`;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Usuários
        </Link>
        <div className="flex items-center gap-3.5">
          <AvatarWithRole
            nome={usuario.nome}
            size={56}
            role={usuario.role === "paciente" ? undefined : usuario.role}
          />
          <div>
            <div className="font-heading text-lg font-extrabold text-white">{usuario.nome}</div>
            <div className="mb-1.5 text-sm text-white/60">{usuario.email}</div>
            <StatusBadge label={roleLabel(usuario.role)} status={roleBadgeStatus(usuario.role)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
          {[
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail
                </span>
              ),
              valor: <span className="font-heading font-semibold">{usuario.email}</span>,
            },
            {
              label: "Papel",
              valor: (
                <StatusBadge
                  label={roleLabel(usuario.role)}
                  status={roleBadgeStatus(usuario.role)}
                />
              ),
            },
            {
              label: "Cadastro em",
              valor: (
                <span className="font-heading font-semibold">
                  {usuario.criadoEm ? new Date(usuario.criadoEm).toLocaleDateString("pt-BR") : "—"}
                </span>
              ),
            },
            ...(isPaciente
              ? [
                  {
                    label: "Profissional vinculado",
                    valor: (
                      <span className="font-heading font-semibold">
                        {profissionalVinculado?.nome ?? "Nenhum"}
                      </span>
                    ),
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
              {f.valor}
            </div>
          ))}
        </Card>

        <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          <button
            onClick={() => setDialogAberto("editar")}
            className="border-border flex w-full items-center gap-3.5 border-b p-4 text-left"
          >
            <div className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
              <Pencil className="text-primary h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <div className="font-heading text-sm font-bold">Editar dados</div>
            </div>
            <ChevronRight className="text-gray-3 h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSenhaTemporaria(gerarSenhaTemporaria());
              setDialogAberto("senha");
            }}
            className={cn(
              "border-border flex w-full items-center gap-3.5 p-4 text-left",
              (isPaciente || usuario.role === "profissional") && "border-b",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF3C7]">
              <KeyRound className="h-4.5 w-4.5 text-[#F59E0B]" />
            </div>
            <div className="flex-1">
              <div className="font-heading text-sm font-bold">Redefinir senha</div>
            </div>
            <ChevronRight className="text-gray-3 h-4 w-4" />
          </button>
          {isPaciente && (
            <Link
              href={`/admin/usuarios/${id}/diagnosticos?voltar=${encodeURIComponent(hrefAtual)}`}
              className="border-border flex w-full items-center gap-3.5 border-b p-4 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EDE9FE]">
                <ChartColumn className="h-4.5 w-4.5 text-[#7C3AED]" />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">Ver diagnósticos</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Link>
          )}
          {isPaciente && (
            <button
              onClick={() => setDialogAberto("vincular")}
              className="flex w-full items-center gap-3.5 p-4 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#DBEAFE]">
                <Link2 className="h-4.5 w-4.5 text-[#1E40AF]" />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">Vincular profissional</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </button>
          )}
          {usuario.role === "profissional" && (
            <Link
              href={`/admin/usuarios/${id}/pacientes`}
              className="flex w-full items-center gap-3.5 p-4 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EDE9FE]">
                <Users className="h-4.5 w-4.5 text-[#7C3AED]" />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">Ver pacientes</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Link>
          )}
        </Card>

        <Button variant="danger" className="w-full" onClick={() => setDialogAberto("bloquear")}>
          <Ban className="h-4.5 w-4.5" /> Bloquear usuário
        </Button>
      </div>

      <EditUsuarioDialog
        open={dialogAberto === "editar"}
        onOpenChange={(open) => setDialogAberto(open ? "editar" : null)}
        usuario={usuario}
        salvando={atualizar.isPending}
        onSave={(v) => atualizar.mutate({ id, ...v }, { onSuccess: () => setDialogAberto(null) })}
      />
      <ResetarSenhaUsuarioDialog
        open={dialogAberto === "senha"}
        onOpenChange={(open) => setDialogAberto(open ? "senha" : null)}
        usuario={usuario}
        senhaTemporaria={senhaTemporaria}
      />
      {isPaciente && (
        <VincularProfissionalDialog
          open={dialogAberto === "vincular"}
          onOpenChange={(open) => setDialogAberto(open ? "vincular" : null)}
          paciente={usuario}
          vinculadoAtualId={paciente?.profissionalVinculadoId}
          salvando={vincular.isPending}
          onVincular={(profissionalId) =>
            vincular.mutate(
              { pacienteId: id, profissionalId },
              { onSuccess: () => setDialogAberto(null) },
            )
          }
        />
      )}
      <AlertDialog
        open={dialogAberto === "bloquear"}
        onOpenChange={(open) => setDialogAberto(open ? "bloquear" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o bloqueio de <strong>{usuario.nome}</strong>? O acesso ao app será suspenso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => setDialogAberto(null)}>
              Confirmar bloqueio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
