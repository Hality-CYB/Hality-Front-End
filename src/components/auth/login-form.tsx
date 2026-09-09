"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLogin, useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { PasswordInput } from "@/components/auth/password-input";
import { BrandMark } from "@/components/auth/brand-mark";
import { GoogleIcon } from "@/components/auth/google-icon";

// Atalho de credenciais só aparece fora de produção — ajuda no
// desenvolvimento/QA e nunca é exibido no build final.
const SHOW_DEMO_HINT = process.env.NODE_ENV !== "production";
const DEMO_ACCOUNTS = ["prof@hality.com", "admin@hality.com"];
const DEMO_PASSWORD = "123456";

export function LoginForm() {
  const { login, isSubmitting, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // US-013 (recuperação de senha) e cadastro são links para outras telas;
  // aqui só garantimos que, com sessão já ativa, o paciente não vê o login de novo.
  useRedirectIfAuthenticated();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void login({ email, password });
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 flex justify-center">
          <BrandMark />
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="abc@abc.com"
              className="focus:border-brand-500 focus:ring-brand-100 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-900">
                Senha
              </label>
              {/* US-013 — Recuperação de senha */}
              <Link
                href="/recuperar-senha"
                className="text-brand-700 hover:text-brand-800 text-sm font-medium"
              >
                Esqueceu sua senha?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-700 hover:bg-brand-800 w-full rounded-full py-3.5 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Login"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">ou</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Login com Google em breve"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-500 opacity-70"
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        {SHOW_DEMO_HINT && (
          <div className="mt-6 rounded-xl bg-blue-50/70 p-4 text-xs text-gray-600">
            <p>
              <span className="font-semibold text-gray-700">Demo:</span> qualquer email +{" "}
              {DEMO_PASSWORD}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1">
              {DEMO_ACCOUNTS.map((demoEmail, index) => (
                <span key={demoEmail} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(demoEmail)}
                    className="text-brand-700 font-medium hover:underline"
                  >
                    {demoEmail}
                  </button>
                  {index < DEMO_ACCOUNTS.length - 1 && <span className="text-gray-400">·</span>}
                </span>
              ))}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Não possui conta?{" "}
          <Link href="/cadastro" className="text-brand-700 hover:text-brand-800 font-semibold">
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}
