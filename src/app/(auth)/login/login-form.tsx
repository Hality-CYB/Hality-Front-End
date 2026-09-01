"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/alert";
import { useLogin } from "@/hooks/use-auth";
import cybFullLogo from "@/assets/images/full-logo-check-your-breath.png";

/** Porta Design/AuthFlow.tsx's tela de login — layout próprio, sem card. */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailFocado, setEmailFocado] = useState(false);
  const [senhaFocada, setSenhaFocada] = useState(false);
  const login = useLogin();

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

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E5E7EB]" />
          <span className="text-muted-foreground text-[13px]">ou</span>
          <div className="h-px flex-1 bg-[#E5E7EB]" />
        </div>

        <button
          type="button"
          onClick={() => login.mutate({ email: "paciente@hality.com", senha: "123456" })}
          className="font-heading flex w-full items-center justify-center gap-2.5 rounded-4xl border-[1.5px] border-[#E5E7EB] bg-white py-3.75 text-base font-semibold text-[#3C4043]"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continuar com Google
        </button>

        <div className="mt-5 rounded-[10px] bg-[rgba(11,107,130,0.06)] px-3.5 py-2.5">
          <p className="text-muted-foreground text-[11.5px] leading-relaxed">
            <strong className="text-foreground">Demo:</strong> senha <strong>123456</strong> pra
            qualquer um dos e-mails abaixo
            <br />
            <strong>paciente@hality.com</strong> · <strong>prof@hality.com</strong> ·{" "}
            <strong>admin@hality.com</strong>
          </p>
        </div>

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
