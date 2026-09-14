"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { Field } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

/**
 * Igual Design/AuthFlow.tsx's tela "forgot" — nenhuma chamada de verdade
 * acontece (nenhum e-mail é enviado), só um flip de estado local. Fica
 * assim mesmo por enquanto, não é o foco desta fase.
 */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEnviado(true);
  }

  return (
    <AuthCard>
      <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
        <KeyRound className="h-5.5 w-5.5" />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">Recuperar senha</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Informe seu e-mail para receber o link de recuperação
      </p>
      {enviado ? (
        <div className="flex flex-col gap-3.5">
          <Alert type="success" message="Link enviado. Verifique sua caixa de entrada." />
          <Button variant="secondary" asChild>
            <Link href="/redefinir-senha">Tenho o código — Redefinir senha</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="seu@email.com"
          />
          <Button type="submit" size="lg">
            Solicitar recuperação
          </Button>
        </form>
      )}
      <p className="mt-4 text-center">
        <Link href="/login" className="text-muted-foreground text-sm">
          ← Voltar ao login
        </Link>
      </p>
    </AuthCard>
  );
}
