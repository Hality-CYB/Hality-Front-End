"use client";

import { useState } from "react";
import { User, Stethoscope, Shield, Check, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { gerarSenhaTemporaria } from "@/lib/gerar-senha";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/usuario";

const OPCOES_ROLE: { valor: Role; label: string; Icon: typeof User; bg: string }[] = [
  { valor: "paciente", label: "Paciente", Icon: User, bg: "bg-secondary" },
  { valor: "profissional", label: "Profissional", Icon: Stethoscope, bg: "bg-[#DBEAFE]" },
  { valor: "admin", label: "Admin", Icon: Shield, bg: "bg-[#FEF3C7]" },
];

/** Mesmo mínimo do back (`SENHA_TAMANHO_MINIMO`). */
const SENHA_TAMANHO_MINIMO = 8;

export type NovoUsuario = {
  nome: string;
  email: string;
  telefone: string;
  role: Role;
  senha: string;
  profissional?: { registro: string; especialidade: string; vinculadoHality: boolean };
};

type CriarUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (v: NovoUsuario) => void;
  salvando?: boolean;
  erro?: string | null;
  onReset?: () => void;
};

const classeCampo =
  "border-border w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none";
const classeLabel = "text-muted-foreground font-heading mb-1.5 block text-xs font-bold";

/**
 * Porta Design/'s CreateUserModal. O back exige a senha inicial no cadastro
 * (`POST /admin/usuarios`); o admin digita ou gera uma e repassa ao usuário.
 */
export function CriarUsuarioDialog({
  open,
  onOpenChange,
  onCreate,
  salvando,
  erro,
  onReset,
}: CriarUsuarioDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState<Role>("paciente");
  const [senha, setSenha] = useState("");
  const [registro, setRegistro] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNome("");
      setEmail("");
      setTelefone("");
      setRole("paciente");
      setSenha("");
      setRegistro("");
      setEspecialidade("");
      onReset?.();
    }
    onOpenChange(next);
  }

  const podeCriar =
    nome.trim().length >= 2 &&
    email.trim().length > 0 &&
    senha.length >= SENHA_TAMANHO_MINIMO &&
    !salvando;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[70dvh] flex-col gap-3.5 overflow-y-auto">
          <div>
            <label htmlFor="novo-nome" className={classeLabel}>
              Nome completo
            </label>
            <input
              id="novo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário"
              className={classeCampo}
            />
          </div>
          <div>
            <label htmlFor="novo-email" className={classeLabel}>
              E-mail
            </label>
            <input
              id="novo-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className={classeCampo}
            />
          </div>
          <div>
            <label htmlFor="novo-telefone" className={classeLabel}>
              Telefone (opcional)
            </label>
            <input
              id="novo-telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className={classeCampo}
            />
          </div>
          <div>
            <span className={classeLabel}>Tipo de usuário</span>
            <div className="flex flex-col gap-2">
              {OPCOES_ROLE.map(({ valor, label, Icon, bg }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setRole(valor)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left",
                    role === valor ? "border-primary bg-secondary" : "border-border bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px]",
                      bg,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-heading text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
          {role === "profissional" && (
            <>
              <div>
                <label htmlFor="novo-registro" className={classeLabel}>
                  Registro profissional
                </label>
                <input
                  id="novo-registro"
                  value={registro}
                  onChange={(e) => setRegistro(e.target.value)}
                  placeholder="Ex.: CRO-RS 12345"
                  className={classeCampo}
                />
              </div>
              <div>
                <label htmlFor="novo-especialidade" className={classeLabel}>
                  Especialidade
                </label>
                <input
                  id="novo-especialidade"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  className={classeCampo}
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="novo-senha" className={classeLabel}>
              Senha inicial
            </label>
            <div className="flex gap-2">
              <input
                id="novo-senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={`Mínimo ${SENHA_TAMANHO_MINIMO} caracteres`}
                className={classeCampo}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSenha(gerarSenhaTemporaria())}
              >
                <RefreshCw className="h-4 w-4" /> Gerar
              </Button>
            </div>
            <span className="text-muted-foreground mt-1 block text-xs">
              Repasse a senha ao usuário. Ele pode trocá-la depois em Perfil.
            </span>
          </div>
          {erro && <Alert type="error" message={erro} />}
          <Button
            size="lg"
            disabled={!podeCriar}
            onClick={() =>
              onCreate({
                nome: nome.trim(),
                email: email.trim(),
                telefone: telefone.trim(),
                role,
                senha,
                ...(role === "profissional"
                  ? { profissional: { registro, especialidade, vinculadoHality: false } }
                  : {}),
              })
            }
          >
            <Check className="h-4 w-4" /> {salvando ? "Criando…" : "Criar usuário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
