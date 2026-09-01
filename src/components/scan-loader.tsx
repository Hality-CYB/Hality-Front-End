"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";

const SCAN_MESSAGES = [
  "Detectando padrões...",
  "Comparando com base de dados...",
  "Calculando classificação...",
];

type ScanLoaderProps = {
  title: string;
  subtitle?: string;
};

/** Tela de "processando" enquanto a IA analisa a foto + anamnese. */
export function ScanLoader({ title, subtitle }: ScanLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % SCAN_MESSAGES.length);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-0 py-12 text-center">
      <div className="relative h-22 w-22">
        <div
          className="animate-scan-spin absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, var(--primary), var(--color-green-600), var(--color-teal-700), var(--primary))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />
        <div className="bg-card absolute inset-2.5 flex items-center justify-center rounded-full shadow-sm">
          <div
            className="animate-scan-pulse flex h-8.5 w-8.5 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-brand)" }}
          >
            <ScanLine className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
      </div>
      <div>
        <h2 className="font-heading mb-1.5 text-lg font-extrabold">{title}</h2>
        {subtitle && <p className="text-muted-foreground mb-3.5 max-w-70 text-sm">{subtitle}</p>}
        <div
          className={`bg-border mx-auto h-1 w-45 overflow-hidden rounded-4xl ${subtitle ? "" : "mt-3.5"}`}
        >
          <div
            className="animate-scan-bar h-full w-2/5 rounded-4xl"
            style={{ background: "var(--gradient-brand)" }}
          />
        </div>
        <p className="text-primary font-heading mt-2.5 min-h-4 text-xs font-semibold">
          {SCAN_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
}
