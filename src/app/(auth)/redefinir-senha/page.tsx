"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { PasswordField } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import { useResetPassword } from "@/hooks/use-auth";

/**
 * O token de reset chega via query string: /redefinir-senha?token=<jwt_emitido_pelo_backend>
 * Se não houver token na URL, exibe mensagem de link inválido.
 */
export default function RedefinirSenhaPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenha2, setNovaSenha2] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const resetPassword = useResetPassword();

  const naoCoincidem = !!novaSenha && !!novaSenha2 && novaSenha !== novaSenha2;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroLocal("");

    if (!token) {
      setErroLocal("Link de recuperação inválido. Solicite um novo link.");
      return;
    }

    if (novaSenha.length < 8) {
      setErroLocal("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (naoCoincidem) {
      setErroLocal("As senhas não coincidem.");
      return;
    }

    resetPassword.mutate({ token, novaSenha });
  }

  if (!token) {
    return (
      <AuthCard>
        <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
          <Lock className="h-5.5 w-5.5" />
        </div>
        <h2 className="font-heading mb-1 text-[22px] font-black">Link inválido</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Este link de recuperação é inválido ou expirou.
        </p>
        <Button asChild>
          <Link href="/esqueci-senha">Solicitar novo link</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
        <Lock className="h-5.5 w-5.5" />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">Nova senha</h2>
      <p className="text-muted-foreground mb-6 text-sm">Crie uma nova senha segura</p>
      {resetPassword.isSuccess ? (
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
          {(erroLocal || naoCoincidem || resetPassword.isError) && (
            <Alert
              message={
                erroLocal ||
                (naoCoincidem ? "As senhas não coincidem." : undefined) ||
                (resetPassword.error instanceof Error
                  ? resetPassword.error.message
                  : "Não foi possível redefinir a senha.")
              }
            />
          )}
          <Button
            type="submit"
            size="lg"
            disabled={naoCoincidem || resetPassword.isPending}
          >
            {resetPassword.isPending ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
