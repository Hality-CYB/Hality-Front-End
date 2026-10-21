import Image from "next/image";
import type { ReactNode } from "react";
import cybIcon from "@/assets/images/icon-check-your-breath.png";
import halityLogo from "@/assets/images/logo-hality.png";
import { LockKeyhole } from "lucide-react";

/** Porta Design/'s AuthPage — usado por registro/esqueci-senha/redefinir-senha. */
export function AuthCard({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "identity";
}) {
  if (variant === "identity") {
    return (
      <main className="bg-background to-background shell:p-8 relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-linear-to-b from-teal-50 px-5 py-8">
        <div
          aria-hidden
          className="bg-secondary pointer-events-none absolute -top-24 -right-24 -z-10 size-64 rounded-full opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 -z-10 size-64 rounded-full bg-green-100 opacity-30"
        />
        <div className="w-full max-w-100">
          <header className="mb-6 flex flex-col items-center">
            <Image
              src={halityLogo}
              alt="Hality — Diagnóstico e tratamento do mau hálito"
              className="h-16 w-auto object-contain"
              priority
            />
          </header>
          <section className="bg-card shell:p-7 rounded-3xl p-6 shadow-lg">{children}</section>
          <p className="text-muted-foreground mt-5 flex items-center justify-center gap-2 text-xs">
            <LockKeyhole aria-hidden className="size-3" /> Ambiente seguro e protegido
          </p>
        </div>
      </main>
    );
  }
  return (
    <div className="bg-background shell:p-8 flex min-h-full flex-col items-center justify-center p-5">
      <div className="w-full max-w-100">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center">
            <Image src={cybIcon} alt="Check Your Breath" className="h-22.5 w-auto object-contain" />
          </div>
          <h1 className="font-heading mb-1 text-2xl tracking-tight text-[var(--color-teal-900)]">
            Check <span className="text-[var(--color-teal-700)]">Your</span> Breath
          </h1>
          <p className="text-muted-foreground text-[13px]">
            Diagnóstico inteligente do hálito com IA
          </p>
        </div>
        <div className="bg-card shell:p-7 rounded-3xl p-6 shadow-md">{children}</div>
      </div>
    </div>
  );
}
