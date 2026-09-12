"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/alert";
import { useLogin, useRedirectIfAuthenticated } from "@/hooks/use-auth";
import cybFullLogo from "@/assets/images/full-logo-check-your-breath.png";

/** Porta Design/AuthFlow.tsx's tela de login — layout próprio, sem card. */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailFocado, setEmailFocado] = useState(false);
  const [senhaFocada, setSenhaFocada] = useState(false);
  const login = useLogin();

  useRedirectIfAuthenticated();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || !senha) return;
    login.mutate({ email, senha });
  }

  return (
    <div className="bg-background flex min-h-full flex-col">
      <div className="flex flex-1 items-center justify-center px-8 pt-16 pb-8">
        <Image
          src={cybFullLogo}
          alt="Check Your Breath"
          className="w-full max-w-80 object-contain"
          priority
        />
      </div>

      <div className="mx-auto w-full max-w-100 px-6 pb-13">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="mb-4">
            <label className="font-heading mb-2 block text-sm font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="abc@abc.com"
              autoComplete="email"
              onFocus={() => setEmailFocado(true)}
              onBlur={() => setEmailFocado(false)}
              className="w-full rounded-xl border-[1.5px] bg-white px-4 py-4 text-base transition-colors outline-none"
              style={{ borderColor: emailFocado ? "var(--primary)" : "#D1D5DB" }}
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-heading text-sm font-semibold">Senha</label>
              <Link
                href="/esqueci-senha"
                className="font-heading text-primary text-[13px] font-semibold"
              >
                Esqueceu sua senha?
              </Link>
            </div>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                onFocus={() => setSenhaFocada(true)}
                onBlur={() => setSenhaFocada(false)}
                className="w-full rounded-xl border-[1.5px] bg-white py-4 pr-12 pl-4 text-base transition-colors outline-none"
                style={{ borderColor: senhaFocada ? "var(--primary)" : "#D1D5DB" }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((s) => !s)}
                className="text-gray-3 absolute top-1/2 right-3.5 flex -translate-y-1/2 p-1"
              >
                {mostrarSenha ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {login.isError && (
            <div className="mb-4">
              <Alert
                message={
                  login.error instanceof Error ? login.error.message : "E-mail ou senha incorretos."
                }
              />
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="font-heading bg-primary w-full rounded-4xl py-4.25 text-[17px] font-bold tracking-tight text-white active:opacity-85 disabled:opacity-60"
          >
            {login.isPending ? "Entrando…" : "Login"}
          </button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-[15px]">
          Não possui conta?{" "}
          <Link href="/registro" className="font-heading text-primary font-bold">
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}
