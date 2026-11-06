"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Alert } from "@/components/alert";
import { Field } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import { useReenviarConfirmacao } from "@/hooks/use-auth";

type ConfirmacaoEmailPendenteProps = {
  email?: string;
  titulo?: string;
  descricao?: string;
  onVoltar?: () => void;
};

export function ConfirmacaoEmailPendente({
  email,
  titulo = "Confirme seu e-mail",
  descricao,
  onVoltar,
}: ConfirmacaoEmailPendenteProps) {
  const [emailDigitado, setEmailDigitado] = useState("");
  const reenviar = useReenviarConfirmacao();
  const enderecoConhecido = email?.trim() ?? "";
  const endereco = enderecoConhecido || emailDigitado.trim();
  const instrucao =
    descricao ??
    (enderecoConhecido
      ? `Enviamos um link de confirmação para ${enderecoConhecido}. Abra o e-mail para ativar sua conta.`
      : "Abra o link de confirmação que enviamos para o seu e-mail para ativar sua conta.");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!endereco || reenviar.isPending) return;
    reenviar.mutate(endereco);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="bg-background mb-4 flex size-14 items-center justify-center rounded-full">
        <Mail className="text-primary size-7" aria-hidden />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">{titulo}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{instrucao}</p>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 text-left">
        {!enderecoConhecido && (
          <Field
            label="E-mail"
            value={emailDigitado}
            onChange={setEmailDigitado}
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
          />
        )}
        {reenviar.isSuccess && (
          <Alert
            type="info"
            message="Se o endereço estiver cadastrado e pendente, enviaremos um novo link. Consulte seu e-mail."
          />
        )}
        {reenviar.isError && <Alert message={reenviar.error.message} />}
        <Button type="submit" size="lg" variant="secondary" disabled={reenviar.isPending}>
          {reenviar.isPending
            ? "Reenviando…"
            : reenviar.isError
              ? "Tentar de novo"
              : "Reenviar e-mail de confirmação"}
        </Button>
      </form>
      {onVoltar ? (
        <button
          type="button"
          onClick={onVoltar}
          className="font-heading text-primary mt-4 text-sm font-bold"
        >
          Voltar ao login
        </button>
      ) : (
        <Link href="/login" className="font-heading text-primary mt-4 text-sm font-bold">
          Ir para o login
        </Link>
      )}
    </div>
  );
}
