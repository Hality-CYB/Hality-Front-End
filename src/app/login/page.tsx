"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "E-mail ou senha incorretos."
            : "Erro ao fazer login. Tente novamente.",
        );
      } else {
        setError("Erro de conexão. Verifique sua internet.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      {/* Logo area */}
      <div className="flex flex-1 items-center justify-center px-8 pt-16 pb-8">
        <Image
          src="/logo-cyb-full.png"
          alt="Check Your Breath"
          width={320}
          height={120}
          className="w-full max-w-[320px] object-contain"
          priority
        />
      </div>

      {/* Form area */}
      <div className="mx-auto box-border w-full max-w-[400px] px-6 pb-13">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-semibold"
              style={{ color: "var(--body)", fontFamily: "Outfit" }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="abc@abc.com"
              autoComplete="email"
              className="login-input w-full"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-semibold"
                style={{ color: "var(--body)", fontFamily: "Outfit" }}
              >
                Senha
              </label>
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold"
                style={{ color: "var(--teal-800)", fontFamily: "Outfit" }}
              >
                Esqueceu sua senha?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="login-input w-full pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 right-3.5 flex -translate-y-1/2 cursor-pointer border-none bg-transparent p-1"
                style={{ color: "var(--gray-3)" }}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-4">
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
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-full border-none py-4.5 text-[17px] font-bold text-white transition-opacity"
            style={{
              background: "var(--teal-800)",
              fontFamily: "Outfit",
              letterSpacing: -0.2,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Entrando..." : "Login"}
          </button>
        </form>

        {/* Register link */}
        <p
          className="mt-6 text-center text-[15px]"
          style={{ color: "var(--gray-text)" }}
        >
          Não possui conta?{" "}
          <Link
            href="/cadastro"
            className="border-none bg-transparent p-0 text-[15px] font-bold no-underline"
            style={{ color: "var(--teal-800)", fontFamily: "Outfit" }}
          >
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ─── Ícones SVG inline (do design) ─────────────────────────────────────────── */

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
