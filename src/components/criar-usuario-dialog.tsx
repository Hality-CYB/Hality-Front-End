"use client";

import { useState, type FormEvent } from "react";
import { User, Stethoscope, Shield, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { Field } from "@/components/auth-fields";
import { cn } from "@/lib/utils";
import { usuarioSchema, type Role } from "@/types/usuario";
import type { NovoUsuarioAdmin } from "@/services/usuario-service";

const OPCOES_ROLE = [
  { valor: "paciente", label: "Paciente", Icon: User },
  { valor: "profissional", label: "Profissional", Icon: Stethoscope },
  { valor: "admin", label: "Admin", Icon: Shield },
] as const;

export type NovoUsuario = Omit<NovoUsuarioAdmin, "senha" | "telefone"> & {
  telefone: string;
};

type CriarUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (value: NovoUsuario) => void;
  salvando?: boolean;
  erro?: string | null;
  onReset?: () => void;
  demonstracao?: boolean;
};

export function CriarUsuarioDialog({
  open,
  onOpenChange,
  onCreate,
  salvando = false,
  erro,
  onReset,
  demonstracao,
}: CriarUsuarioDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState<Role>("paciente");
  const [registro, setRegistro] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  function handleOpenChange(next: boolean) {
    if (salvando) return;
    if (!next) {
      setNome("");
      setEmail("");
      setTelefone("");
      setRole("paciente");
      setRegistro("");
      setEspecialidade("");
      onReset?.();
    }
    onOpenChange(next);
  }

  const podeCriar =
    nome.trim().length >= 2 &&
    usuarioSchema.shape.email.safeParse(email.trim()).success &&
    !salvando;
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!podeCriar) return;
    onCreate({
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      role,
      ...(role === "profissional"
        ? { profissional: { registro, especialidade, vinculadoHality: false } }
        : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
          <DialogDescription>
            O usuário define a própria senha pelo convite recebido por e-mail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} aria-busy={salvando} className="flex flex-col gap-3.5">
          <Field
            label="Nome completo"
            value={nome}
            onChange={setNome}
            required
            minLength={2}
            maxLength={255}
            autoComplete="name"
            disabled={salvando}
          />
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
            disabled={salvando}
          />
          <Field
            label="Telefone (opcional)"
            value={telefone}
            onChange={setTelefone}
            type="tel"
            maxLength={20}
            autoComplete="tel"
            disabled={salvando}
          />
          <fieldset disabled={salvando} className="flex flex-col gap-2">
            <legend className="text-muted-foreground font-heading mb-2 text-xs font-semibold">
              Tipo de usuário
            </legend>
            {OPCOES_ROLE.map(({ valor, label, Icon }) => (
              <label
                key={valor}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border p-3.5",
                  role === valor ? "border-primary bg-secondary" : "border-border bg-card",
                )}
              >
                <input
                  type="radio"
                  name="novo-role"
                  value={valor}
                  checked={role === valor}
                  onChange={() => setRole(valor)}
                  className="accent-primary size-4"
                />
                <Icon aria-hidden className="text-primary size-5" />
                <span className="font-heading text-sm font-bold">{label}</span>
              </label>
            ))}
          </fieldset>
          {role === "profissional" && (
            <>
              <Field
                label="Registro profissional"
                value={registro}
                onChange={setRegistro}
                maxLength={50}
                disabled={salvando}
              />
              <Field
                label="Especialidade"
                value={especialidade}
                onChange={setEspecialidade}
                maxLength={100}
                disabled={salvando}
              />
            </>
          )}
          {demonstracao && (
            <Alert type="info" message="Modo de demonstração: nenhum e-mail será enviado." />
          )}
          {erro && <Alert message={erro} />}
          <Button size="lg" type="submit" disabled={!podeCriar}>
            <Mail aria-hidden className="size-4" />
            {salvando ? "Criando…" : "Criar e convidar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
