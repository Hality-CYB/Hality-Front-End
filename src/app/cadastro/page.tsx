"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

export default function CadastroPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Aplica máscara de telefone brasileiro: (XX) XXXXX-XXXX */
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !passwordConfirm) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!acceptTerms) {
      setError("Aceite os termos para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name,
        email,
        phone: phone || undefined,
        password,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (() => {
          try {
            return JSON.parse(err.message)?.detail;
          } catch {
            return null;
          }
        })();
        setError(detail || "Erro ao criar conta. Tente novamente.");
      } else {
        setError("Erro de conexão. Verifique sua internet.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5 py-8"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-white"
            style={{
              border: "1.5px solid var(--teal-200)",
              boxShadow: "0 4px 20px rgba(11,107,130,0.15)",
            }}
          >
            <Image
              src="/icon-cyb.png"
              alt="Check Your Breath"
              width={55}
              height={55}
              className="object-contain"
            />
          </div>
          <h1
            className="mb-1 text-2xl font-black"
            style={{ fontFamily: "Outfit", color: "var(--body)", letterSpacing: -0.5 }}
          >
            Check Your Breath
          </h1>
          <p className="m-0 text-[13px]" style={{ color: "var(--gray-text)" }}>
            Diagnóstico inteligente do hálito com IA
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl bg-white px-6 py-7"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <h2
            className="mb-1 text-[22px] font-black"
            style={{ fontFamily: "Outfit", color: "var(--body)" }}
          >
            Criar conta
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--gray-text)" }}>
            Preencha seus dados para começar
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Nome completo */}
            <FieldGroup htmlFor="register-name" label="Nome completo *">
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                className="auth-input w-full"
              />
            </FieldGroup>

            {/* E-mail */}
            <FieldGroup htmlFor="register-email" label="E-mail *">
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="auth-input w-full"
              />
            </FieldGroup>

            {/* Telefone */}
            <FieldGroup htmlFor="register-phone" label="Telefone">
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                className="auth-input w-full"
              />
            </FieldGroup>

            {/* Senha */}
            <FieldGroup htmlFor="register-password" label="Senha *">
              <div className="relative">
                <input
                  id="register-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="auth-input w-full pr-12"
                />
                <TogglePasswordBtn
                  show={showPw}
                  onToggle={() => setShowPw((s) => !s)}
                />
              </div>
            </FieldGroup>

            {/* Confirmar senha */}
            <FieldGroup htmlFor="register-password-confirm" label="Confirmar senha *">
              <div className="relative">
                <input
                  id="register-password-confirm"
                  type={showPw2 ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="auth-input w-full pr-12"
                />
                <TogglePasswordBtn
                  show={showPw2}
                  onToggle={() => setShowPw2((s) => !s)}
                />
              </div>
            </FieldGroup>

            {/* Termos */}
            <label className="mt-0.5 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-[3px] h-4 w-4 shrink-0"
                style={{ accentColor: "var(--teal-800)" }}
              />
              <span
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--gray-text)" }}
              >
                Li e aceito os{" "}
                <span className="font-semibold" style={{ color: "var(--teal-800)" }}>
                  Termos de Uso
                </span>{" "}
                e a{" "}
                <span className="font-semibold" style={{ color: "var(--teal-800)" }}>
                  Política de Privacidade
                </span>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px]"
                style={{
                  background: "#FFF1F0",
                  border: "1px solid rgba(255,59,48,0.15)",
                  color: "#C0392B",
                }}
              >
                <span
                  className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ background: "#C0392B" }}
                >
                  !
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-[14px] border-none py-4 text-base font-bold text-white transition-opacity"
              style={{
                background: "var(--teal-800)",
                fontFamily: "Outfit",
                letterSpacing: -0.1,
                boxShadow: "0 2px 8px rgba(11,107,130,0.25)",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-4 flex flex-col items-center gap-2.5">
          <p className="m-0 text-sm" style={{ color: "var(--gray-text)" }}>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="border-none bg-transparent p-0 text-sm font-bold no-underline"
              style={{ color: "var(--teal-800)", fontFamily: "Outfit" }}
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Componentes auxiliares ─────────────────────────────────────────────────── */

function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-semibold"
        style={{ color: "var(--gray-text)", fontFamily: "Outfit" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TogglePasswordBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-1/2 right-3.5 flex -translate-y-1/2 cursor-pointer border-none bg-transparent p-1"
      style={{ color: "var(--gray-3)" }}
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
