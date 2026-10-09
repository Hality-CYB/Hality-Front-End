"use client";

import { use, useDeferredValue, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Pencil,
  KeyRound,
  Link2,
  Ban,
  ChartColumn,
  Users,
  Stethoscope,
  Unlink,
  CircleCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/alert";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { EditUsuarioDialog } from "@/components/edit-usuario-dialog";
import { EditDadosProfissionaisDialog } from "@/components/edit-dados-profissionais-dialog";
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
import {
  mensagemErroAtualizarUsuario,
  useAtualizarProfissional,
  useAtualizarUsuario,
  useUsuario,
  useUsuarios,
} from "@/hooks/use-usuarios";
import {
  mensagemErroVinculo,
  useCriarVinculo,
  useEncerrarVinculo,
  useVinculos,
} from "@/hooks/use-vinculos";
import { roleLabel, roleBadgeStatus } from "@/lib/role-format";
import { cn } from "@/lib/utils";
import type { Vinculo } from "@/types/admin";

type DialogAberto = "editar" | "profissional" | "vincular" | "bloquear" | null;

const classeAcao =
  "border-border flex w-full items-center gap-3.5 border-b p-4 text-left last:border-b-0";

export default function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/admin/usuarios";
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null);
  const [vinculoParaEncerrar, setVinculoParaEncerrar] = useState<Vinculo | null>(null);
  const [buscaProfissional, setBuscaProfissional] = useState("");
  const buscaProfissionalAdiada = useDeferredValue(buscaProfissional);

  const { data: usuario, isError } = useUsuario(id);
  const isPaciente = usuario?.role === "paciente";
  const vinculos = useVinculos(
    { pacienteId: id, ativo: true, limite: 50 },
    { enabled: isPaciente },
  );
  const profissionais = useUsuarios(
    { role: "profissional", ativo: true, busca: buscaProfissionalAdiada, limite: 20 },
    { enabled: dialogAberto === "vincular" },
  );
  const atualizar = useAtualizarUsuario();
  const atualizarProfissional = useAtualizarProfissional();
  const vincular = useCriarVinculo();
  const encerrar = useEncerrarVinculo();

  if (isError) {
    return (
      <div className="p-4">
        <Alert type="error" message="Usuário não encontrado." />
      </div>
    );
  }
  if (!usuario) return null;

  const bloqueado = usuario.ativo === false;
  const vinculosAtivos = isPaciente ? (vinculos.data?.itens ?? []) : [];
  const hrefAtual = `/admin/usuarios/${id}?voltar=${encodeURIComponent(voltarHref)}`;
  const perfil = usuario.perfilProfissional;

  function fecharDialog() {
    setDialogAberto(null);
  }

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-center gap-3.5">
          <AvatarWithRole
            nome={usuario.nome}
            size={56}
            role={usuario.role === "paciente" ? undefined : usuario.role}
          />
          <div className="min-w-0">
            <div className="font-heading truncate text-lg font-extrabold text-white">
              {usuario.nome}
            </div>
            <div className="mb-1.5 truncate text-sm text-white/60">{usuario.email}</div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge label={roleLabel(usuario.role)} status={roleBadgeStatus(usuario.role)} />
              {bloqueado && <StatusBadge label="Bloqueado" status="danger" />}
            </div>
          </div>
        </div>
      </div>

      <div className="shell:grid shell:grid-cols-2 shell:items-start flex flex-col gap-3.5 p-4">
        <div className="flex flex-col gap-3.5">
          <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
            {[
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> E-mail
                  </span>
                ),
                valor: usuario.email,
              },
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Telefone
                  </span>
                ),
                valor: usuario.telefone || "—",
              },
              {
                label: "Cadastro em",
                valor: usuario.criadoEm
                  ? new Date(usuario.criadoEm).toLocaleDateString("pt-BR")
                  : "—",
              },
              ...(usuario.role === "profissional"
                ? [
                    { label: "Registro", valor: perfil?.registro || "—" },
                    { label: "Especialidade", valor: perfil?.especialidade || "—" },
                    { label: "Vinculado à Hality", valor: perfil?.vinculadoHality ? "Sim" : "Não" },
                  ]
                : []),
            ].map((f, i, arr) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between gap-3 py-3 text-sm",
                  i < arr.length - 1 && "border-border border-b",
                )}
              >
                <span className="text-muted-foreground shrink-0">{f.label}</span>
                <span className="font-heading truncate font-semibold">{f.valor}</span>
              </div>
            ))}
          </Card>

          {isPaciente && (
            <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-extrabold">Profissionais vinculados</h2>
                <Button size="sm" variant="secondary" onClick={() => setDialogAberto("vincular")}>
                  <Link2 className="h-4 w-4" /> Vincular
                </Button>
              </div>
              {vinculos.isSuccess && vinculosAtivos.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum profissional vinculado.</p>
              )}
              {vinculosAtivos.map((v) => (
                <div
                  key={v.id}
                  className="border-border flex items-center gap-3 border-b py-3 last:border-b-0"
                >
                  <AvatarWithRole nome={v.profissionalNome} size={36} role="profissional" />
                  <Link
                    href={`/admin/usuarios/${v.profissionalId}?voltar=${encodeURIComponent(hrefAtual)}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="font-heading truncate text-sm font-bold">
                      {v.profissionalNome}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Desde {new Date(v.vinculadoEm).toLocaleDateString("pt-BR")}
                    </div>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Encerrar vínculo com ${v.profissionalNome}`}
                    onClick={() => setVinculoParaEncerrar(v)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
            <button onClick={() => setDialogAberto("editar")} className={classeAcao}>
              <div className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
                <Pencil className="text-primary h-4.5 w-4.5" />
              </div>
              <div className="font-heading flex-1 text-sm font-bold">Editar dados</div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </button>
            {usuario.role === "profissional" && (
              <button onClick={() => setDialogAberto("profissional")} className={classeAcao}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#DBEAFE]">
                  <Stethoscope className="h-4.5 w-4.5 text-[#1E40AF]" />
                </div>
                <div className="font-heading flex-1 text-sm font-bold">Dados profissionais</div>
                <ChevronRight className="text-gray-3 h-4 w-4" />
              </button>
            )}
            {/* TODO(backend): não existe rota para o admin redefinir a senha de outro
                usuário (`PATCH /admin/usuarios/{id}` recusa `senha`). Falta decidir com o
                time como a redefinição funciona antes de ligar esta ação. */}
            <div className={cn(classeAcao, "opacity-60")} aria-disabled>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF3C7]">
                <KeyRound className="h-4.5 w-4.5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <div className="font-heading text-sm font-bold">Redefinir senha</div>
                <div className="text-muted-foreground text-xs">Ainda não disponível</div>
              </div>
            </div>
            {isPaciente && (
              <Link
                href={`/admin/usuarios/${id}/diagnosticos?voltar=${encodeURIComponent(hrefAtual)}`}
                className={classeAcao}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EDE9FE]">
                  <ChartColumn className="h-4.5 w-4.5 text-[#7C3AED]" />
                </div>
                <div className="font-heading flex-1 text-sm font-bold">Ver diagnósticos</div>
                <ChevronRight className="text-gray-3 h-4 w-4" />
              </Link>
            )}
            {usuario.role === "profissional" && (
              <Link
                href={`/admin/usuarios/${id}/pacientes?voltar=${encodeURIComponent(hrefAtual)}`}
                className={classeAcao}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EDE9FE]">
                  <Users className="h-4.5 w-4.5 text-[#7C3AED]" />
                </div>
                <div className="font-heading flex-1 text-sm font-bold">Ver pacientes</div>
                <ChevronRight className="text-gray-3 h-4 w-4" />
              </Link>
            )}
          </Card>

          {atualizar.isError && dialogAberto === null && (
            <Alert type="error" message={mensagemErroAtualizarUsuario(atualizar.error)} />
          )}
          <Button
            variant={bloqueado ? "success" : "danger"}
            className="w-full"
            onClick={() => setDialogAberto("bloquear")}
          >
            {bloqueado ? (
              <>
                <CircleCheck className="h-4.5 w-4.5" /> Desbloquear usuário
              </>
            ) : (
              <>
                <Ban className="h-4.5 w-4.5" /> Bloquear usuário
              </>
            )}
          </Button>
        </div>
      </div>

      <EditUsuarioDialog
        open={dialogAberto === "editar"}
        onOpenChange={(open) => {
          if (!open) atualizar.reset();
          setDialogAberto(open ? "editar" : null);
        }}
        usuario={usuario}
        salvando={atualizar.isPending}
        erro={atualizar.isError ? mensagemErroAtualizarUsuario(atualizar.error) : null}
        onSave={(v) => atualizar.mutate({ id, ...v }, { onSuccess: fecharDialog })}
      />
      {usuario.role === "profissional" && (
        <EditDadosProfissionaisDialog
          open={dialogAberto === "profissional"}
          onOpenChange={(open) => {
            if (!open) atualizarProfissional.reset();
            setDialogAberto(open ? "profissional" : null);
          }}
          initial={{
            registro: perfil?.registro ?? "",
            especialidade: perfil?.especialidade ?? "",
            vinculadoHality: perfil?.vinculadoHality ?? false,
          }}
          salvando={atualizarProfissional.isPending}
          erro={atualizarProfissional.isError ? "Não foi possível salvar. Tente novamente." : null}
          onSave={(v) => atualizarProfissional.mutate({ id, ...v }, { onSuccess: fecharDialog })}
        />
      )}
      {isPaciente && (
        <VincularProfissionalDialog
          open={dialogAberto === "vincular"}
          onOpenChange={(open) => {
            if (!open) vincular.reset();
            setDialogAberto(open ? "vincular" : null);
          }}
          paciente={usuario}
          profissionais={profissionais.data?.itens ?? []}
          busca={buscaProfissional}
          onBuscaChange={setBuscaProfissional}
          jaVinculadosIds={vinculosAtivos.map((v) => v.profissionalId)}
          salvando={vincular.isPending}
          erro={vincular.isError ? mensagemErroVinculo(vincular.error) : null}
          onVincular={(profissionalId) =>
            vincular.mutate({ pacienteId: id, profissionalId }, { onSuccess: fecharDialog })
          }
        />
      )}

      <AlertDialog
        open={dialogAberto === "bloquear"}
        onOpenChange={(open) => setDialogAberto(open ? "bloquear" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bloqueado ? "Desbloquear usuário" : "Bloquear usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bloqueado ? (
                <>
                  <strong>{usuario.nome}</strong> volta a conseguir entrar no app.
                </>
              ) : (
                <>
                  <strong>{usuario.nome}</strong> não vai mais conseguir entrar no app até ser
                  desbloqueado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={bloqueado ? "default" : "danger"}
              onClick={() => atualizar.mutate({ id, ativo: bloqueado })}
            >
              {bloqueado ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={vinculoParaEncerrar !== null}
        onOpenChange={(open) => !open && setVinculoParaEncerrar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar vínculo</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{vinculoParaEncerrar?.profissionalNome}</strong> deixa de ver os dados e os
              diagnósticos de <strong>{usuario.nome}</strong>. O histórico do vínculo continua
              registrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => vinculoParaEncerrar && encerrar.mutate(vinculoParaEncerrar.id)}
            >
              Encerrar vínculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
