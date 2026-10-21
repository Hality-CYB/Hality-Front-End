"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { Field } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import { useSolicitarRecuperacao } from "@/hooks/use-auth";
import { usuarioSchema } from "@/types/usuario";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState("");
  const [espera, setEspera] = useState(0);
  const recovery = useSolicitarRecuperacao();

  useEffect(() => {
    if (espera <= 0) return;
    const timer = window.setTimeout(() => setEspera((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [espera]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (recovery.isPending || espera > 0) return;
    setErroEmail("");
    if (!usuarioSchema.shape.email.safeParse(email.trim()).success) {
      setErroEmail("Informe um e-mail válido.");
      return;
    }
    recovery.mutate(email.trim(), {
      onError: (error) => {
        if ("retryAfterSeconds" in error && typeof error.retryAfterSeconds === "number")
          setEspera(error.retryAfterSeconds);
      },
      onSuccess: () => setEmail(""),
    });
  }

  return (
    <AuthCard variant="identity">
      <div className="bg-secondary text-primary mb-4 flex size-11 items-center justify-center rounded-md">
        <KeyRound aria-hidden className="size-5" />
      </div>
      <h1 className="mb-1 text-xl font-extrabold">Recuperar senha</h1>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        Informe seu e-mail para receber as instruções de recuperação.
      </p>
      {recovery.isSuccess ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="success"
            message="Se o endereço estiver cadastrado, enviaremos instruções. Verifique também a caixa de spam."
          />
          <Button variant="secondary" onClick={() => recovery.reset()}>
            Solicitar novamente
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={recovery.isPending}
          className="flex flex-col gap-3.5"
        >
          <Field
            variant="identity"
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            required
            disabled={recovery.isPending}
            placeholder="seu@email.com"
            error={erroEmail || undefined}
          />
          {recovery.isError && <Alert message={recovery.error.message} />}
          {espera > 0 && (
            <p role="status" className="text-muted-foreground text-sm">
              Tente novamente em {espera} segundos.
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="shadow-md"
            disabled={recovery.isPending || espera > 0}
          >
            {recovery.isPending
              ? "Solicitando…"
              : recovery.isError
                ? "Tentar novamente"
                : "Solicitar recuperação"}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center">
        <Link href="/login" className="text-primary text-sm font-semibold">
          Voltar ao login
        </Link>
      </p>
    </AuthCard>
  );
}
