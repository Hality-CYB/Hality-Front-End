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
  const recuperacao = useSolicitarRecuperacao();

  useEffect(() => {
    if (espera <= 0) return;
    const timer = window.setTimeout(() => setEspera((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [espera]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (recuperacao.isPending || espera > 0) return;
    setErroEmail("");
    if (!usuarioSchema.shape.email.safeParse(email.trim()).success) {
      setErroEmail("Informe um e-mail válido.");
      return;
    }
    recuperacao.mutate(email.trim(), {
      onError: (error) => {
        if (
          "segundosParaTentarDeNovo" in error &&
          typeof error.segundosParaTentarDeNovo === "number"
        )
          setEspera(error.segundosParaTentarDeNovo);
      },
      onSuccess: () => setEmail(""),
    });
  }

  return (
    <AuthCard>
      <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
        <KeyRound aria-hidden className="h-5.5 w-5.5" />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">Recuperar senha</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Informe seu e-mail para receber o link de recuperação.
      </p>
      {recuperacao.isSuccess ? (
        <div className="flex flex-col gap-3.5">
          <Alert
            type="success"
            message="Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam."
          />
          <Button variant="secondary" onClick={() => recuperacao.reset()}>
            Pedir de novo
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={recuperacao.isPending}
          className="flex flex-col gap-3.5"
        >
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            required
            disabled={recuperacao.isPending}
            placeholder="seu@email.com"
            error={erroEmail || undefined}
          />
          {recuperacao.isError && <Alert message={recuperacao.error.message} />}
          {espera > 0 && (
            <p role="status" className="text-muted-foreground text-sm">
              Tente de novo em {espera} segundos.
            </p>
          )}
          <Button type="submit" size="lg" disabled={recuperacao.isPending || espera > 0}>
            {recuperacao.isPending ? "Enviando…" : "Enviar link"}
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
