import Image from "next/image";
import type { ReactNode } from "react";
import cybIcon from "@/assets/images/icon-check-your-breath.png";

/** Porta Design/'s AuthPage — usado por registro/esqueci-senha/redefinir-senha. */
export function AuthCard({ children }: { children: ReactNode }) {
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
