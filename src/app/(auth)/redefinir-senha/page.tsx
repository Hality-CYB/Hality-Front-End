"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { PasswordField } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

/** Igual esqueci-senha/page.tsx — porta Design/'s tela "reset", sem chamada real ainda. */
export default function RedefinirSenhaPage() {
  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenha2, setNovaSenha2] = useState("");
  const [concluido, setConcluido] = useState(false);

  const naoCoincidem = !!novaSenha && !!novaSenha2 && novaSenha !== novaSenha2;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setConcluido(true);
  }

  return (
    <AuthCard>
      <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
        <Lock className="h-5.5 w-5.5" />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">Nova senha</h2>
      <p className="text-muted-foreground mb-6 text-sm">Crie uma nova senha segura</p>
      {concluido ? (
        <div className="flex flex-col gap-3.5">
          <Alert type="success" message="Senha redefinida com sucesso!" />
          <Button asChild>
            <Link href="/login">Ir para o login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <PasswordField
            label="Nova senha"
            value={novaSenha}
            onChange={setNovaSenha}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirmar nova senha"
            value={novaSenha2}
            onChange={setNovaSenha2}
            autoComplete="new-password"
          />
          {naoCoincidem && <Alert message="As senhas não coincidem." />}
          <Button type="submit" size="lg" disabled={naoCoincidem}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
