"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth-service";
import { User, Mail, Phone, Cake, Key, Shield, Info, ChevronRight, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { AboutDialog } from "@/components/about-dialog";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { PrivacyDialog } from "@/components/privacy-dialog";
import { useLogout } from "@/hooks/use-auth";
import {
  mensagemErroConsentimento,
  useDecidirConsentimento,
  useMeusConsentimentos,
  useTermosConsentimento,
} from "@/hooks/use-consentimentos";
import {
  mensagemErroAlterarSenha,
  useAlterarSenha,
  useAtualizarPerfil,
  useUsuarioAtual,
} from "@/hooks/use-usuarios";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";
import { formatarDataSemHorario, hojeNoCalendario, problemaDaDataDeNascimento } from "@/lib/datas";

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
  const google = useQuery({
    queryKey: ["google-vinculo"],
    queryFn: authService.statusVinculoGoogle,
  });
  const vincularGoogle = useMutation({
    mutationFn: authService.iniciarVinculoGoogle,
    onSuccess: ({ url }) => {
      const destino = new URL(url);
      if (destino.origin !== "https://accounts.google.com")
        throw new Error("Destino Google inválido");
      window.location.assign(destino.href);
    },
  });
  const sessao = useSessaoAtual();
  const { data: usuario } = useUsuarioAtual();
  const atualizarPerfil = useAtualizarPerfil();
  const alterarSenha = useAlterarSenha();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const nomeAtual = usuario?.nome ?? sessao.nome;
  const telefoneAtual = usuario?.telefone ?? "";
  const dataNascimentoAtual = usuario?.dataNascimento ?? "";
  const problemaNascimento = editing ? problemaDaDataDeNascimento(dataNascimento) : null;

  function alternarEdicao() {
    if (!editing) {
      setNome(nomeAtual);
      setTelefone(telefoneAtual);
      setDataNascimento(dataNascimentoAtual);
      atualizarPerfil.reset();
    }
    setEditing((e) => !e);
  }

  function salvar() {
    atualizarPerfil.mutate(
      {
        nome,
        telefone,
        // Só manda a data se mudou.
        ...(dataNascimento !== dataNascimentoAtual ? { dataNascimento } : {}),
      },
      { onSuccess: () => setEditing(false) },
    );
  }
  const [dialogAberto, setDialogAberto] = useState<"senha" | "privacidade" | "sobre" | null>(null);
  const logout = useLogout();
  const termos = useTermosConsentimento();
  const consentimentos = useMeusConsentimentos({ enabled: dialogAberto === "privacidade" });
  const decidirConsentimento = useDecidirConsentimento();

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center p-8 pb-13 text-center"
        style={{ background: "var(--gradient-brand)" }}
      >
        <AvatarWithRole nome={nomeAtual} size={72} className="mb-2.5" />
        <div className="font-heading mb-1 text-xl font-extrabold text-white">{nomeAtual}</div>
        <div className="text-sm text-white/55">{sessao.email}</div>
      </div>

      <div className="mt-6 flex flex-col gap-3.5 px-4">
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Dados pessoais</h2>
            <Button variant="secondary" size="sm" onClick={alternarEdicao}>
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
                  aria-label="Nome"
                  value={editing ? nome : nomeAtual}
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
                editing
                  ? problemaNascimento
                    ? "border-destructive"
                    : "border-primary"
                  : "border-transparent",
              )}
            >
              <Cake className="text-gray-3 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <label
                  htmlFor="perfil-data-nascimento"
                  className="text-gray-3 font-heading mb-0.5 block text-[10px] font-bold tracking-wide uppercase"
                >
                  Data de nascimento
                </label>
                {editing ? (
                  <input
                    id="perfil-data-nascimento"
                    type="date"
                    min="1900-01-01"
                    max={hojeNoCalendario()}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    aria-invalid={problemaNascimento ? true : undefined}
                    aria-describedby={
                      problemaNascimento ? "perfil-data-nascimento-erro" : undefined
                    }
                    className="w-full bg-transparent text-[15px] outline-none"
                  />
                ) : (
                  <div id="perfil-data-nascimento" className="text-[15px]">
                    {dataNascimentoAtual
                      ? formatarDataSemHorario(dataNascimentoAtual)
                      : "Não informada"}
                  </div>
                )}
              </div>
            </div>
            {problemaNascimento && (
              <p id="perfil-data-nascimento-erro" className="text-destructive -mt-1 text-xs">
                {problemaNascimento}
              </p>
            )}
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
                  aria-label="Telefone"
                  type="tel"
                  placeholder={editing ? "(11) 99999-9999" : "Não informado"}
                  value={editing ? telefone : telefoneAtual}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={!editing}
                  className="w-full bg-transparent text-[15px] outline-none disabled:opacity-100"
                />
              </div>
            </div>
          </div>
          {editing && atualizarPerfil.isError && (
            <p className="text-destructive mt-3 text-[13px]">
              Não foi possível salvar. Confira os dados e tente de novo.
            </p>
          )}
          {editing && (
            <Button
              className="mt-4 w-full"
              onClick={salvar}
              disabled={nome.trim().length < 2 || !!problemaNascimento || atualizarPerfil.isPending}
            >
              {atualizarPerfil.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          <button
            type="button"
            disabled={
              google.isPending ||
              google.isError ||
              google.data?.vinculado ||
              vincularGoogle.isPending
            }
            onClick={() => vincularGoogle.mutate()}
            className="border-border flex w-full items-center gap-3.5 border-b p-4 text-left disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </span>
            <span className="flex-1">
              <span className="font-heading block text-sm font-bold">Conta Google</span>
              <span className="text-muted-foreground block text-xs">
                {google.isError
                  ? "Não foi possível carregar o vínculo"
                  : google.data?.vinculado
                    ? google.data.email
                      ? `Vinculado a ${google.data.email}`
                      : "Conta Google vinculada"
                    : "Vincular conta Google"}
              </span>
            </span>
            {!google.data?.vinculado && <ChevronRight className="text-gray-3 h-4 w-4" />}
          </button>
          {vincularGoogle.isError && (
            <p role="alert" className="text-destructive px-4 py-2 text-xs">
              Não foi possível iniciar o vínculo. Tente novamente.
            </p>
          )}
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
        onSalvar={(senhas) => alterarSenha.mutate(senhas)}
        salvando={alterarSenha.isPending}
        salvo={alterarSenha.isSuccess}
        erro={alterarSenha.isError ? mensagemErroAlterarSenha(alterarSenha.error) : null}
        onReset={alterarSenha.reset}
      />
      <PrivacyDialog
        open={dialogAberto === "privacidade"}
        onOpenChange={(open) => {
          if (!open) decidirConsentimento.reset();
          setDialogAberto(open ? "privacidade" : null);
        }}
        termos={termos.data ?? []}
        estados={consentimentos.data ?? []}
        carregando={consentimentos.isPending}
        erroCarregar={consentimentos.isError}
        onTentarDeNovo={() => consentimentos.refetch()}
        onDecidir={(decisao) => decidirConsentimento.mutate(decisao)}
        salvando={decidirConsentimento.isPending}
        erroDecisao={
          decidirConsentimento.isError
            ? mensagemErroConsentimento(decidirConsentimento.error)
            : null
        }
      />
      <AboutDialog
        open={dialogAberto === "sobre"}
        onOpenChange={(open) => setDialogAberto(open ? "sobre" : null)}
      />
    </div>
  );
}
