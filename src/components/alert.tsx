import { cn } from "@/lib/utils";

type AlertProps = {
  message: string;
  type?: "error" | "success" | "info";
  className?: string;
};

const CONFIG = {
  error: { bg: "#FFF1F0", border: "rgba(255,59,48,0.15)", color: "#C0392B", icone: "!" },
  success: { bg: "#F0FDF4", border: "rgba(22,163,74,0.2)", color: "#16A34A", icone: "✓" },
  info: {
    bg: "var(--color-teal-100)",
    border: "var(--color-teal-200)",
    color: "var(--primary)",
    icone: "i",
  },
} as const;

/** Porta Design/'s Alert (shared/UI.tsx) — usado em formulários pra erro/sucesso/aviso. */
export function Alert({ message, type = "error", className }: AlertProps) {
  const cfg = CONFIG[type];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.75 text-[13px]",
        className,
      )}
      style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
    >
      <span
        className="mt-0.25 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
        style={{ background: cfg.color }}
      >
        {cfg.icone}
      </span>
      <span>{message}</span>
    </div>
  );
}
