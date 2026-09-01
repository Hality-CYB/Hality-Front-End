import Image from "next/image";
import { BrandWordmark } from "@/components/brand-wordmark";
import cybIcon from "@/assets/images/icon-check-your-breath.png";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-100">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Image src={cybIcon} alt="Check Your Breath" className="h-9 w-auto object-contain" />
          <BrandWordmark className="text-lg" />
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
