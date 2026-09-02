"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { Field, PasswordField } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import { useRegistrar } from "@/hooks/use-auth";

export default function RegistroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState("");
  const registrar = useRegistrar();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro("");
    if (!nome || !email || !senha || !senha2) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (senha !== senha2) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (!aceitaTermos) {
      setErro("Aceite os termos para continuar.");
      return;
    }
    registrar.mutate({ nome, email, senha });
  }

  return (
    <AuthCard>
      <h2 className="font-heading mb-1 text-[22px] font-black">Criar conta</h2>
      <p className="text-muted-foreground mb-6 text-sm">Preencha seus dados para começar</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field
          label="Nome completo *"
          value={nome}
          onChange={setNome}
          placeholder="Seu nome completo"
          autoComplete="name"
        />
        <Field
          label="E-mail *"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
        />
        <Field
          label="Telefone"
          value={telefone}
          onChange={setTelefone}
          placeholder="(11) 99999-9999"
          autoComplete="tel"
        />
        <PasswordField
          label="Senha *"
          value={senha}
          onChange={setSenha}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmar senha *"
          value={senha2}
          onChange={setSenha2}
          autoComplete="new-password"
        />
        <label className="mt-0.5 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={aceitaTermos}
            onChange={(e) => setAceitaTermos(e.target.checked)}
            className="accent-primary mt-0.75 h-4 w-4 shrink-0"
          />
          <span className="text-muted-foreground text-[13px] leading-normal">
            Li e aceito os <span className="text-primary font-semibold">Termos de Uso</span> e a{" "}
            <span className="text-primary font-semibold">Política de Privacidade</span>
          </span>
        </label>
        {(erro || registrar.isError) && (
          <Alert message={erro || "Não foi possível criar a conta."} />
        )}
        <Button type="submit" size="lg" disabled={registrar.isPending}>
          {registrar.isPending ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2.5">
        <Link href="/" className="text-muted-foreground text-sm">
          ← Página inicial
        </Link>
        <p className="text-muted-foreground text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="font-heading text-primary font-bold">
            Entrar
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
