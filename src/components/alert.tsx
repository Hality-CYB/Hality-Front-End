import { cn } from "@/lib/utils";

type AlertProps = {
  message: string;
  type?: "error" | "success" | "info";
  className?: string;
};

const CONFIG = {
  error: {
    container: "bg-alert-error-background border-destructive/15 text-alert-error-foreground",
    icon: "bg-alert-error-foreground",
    icone: "!",
  },
  success: {
    container: "bg-alert-success-background border-green-600/20 text-green-600",
    icon: "bg-green-600",
    icone: "✓",
  },
  info: {
    container: "bg-teal-100 border-teal-200 text-primary",
    icon: "bg-primary",
    icone: "i",
  },
} as const;

/**
 * Porta Design/'s Alert (shared/UI.tsx) — usado em formulários pra erro/sucesso/aviso.
 * Erro usa `role="alert"` (anunciado na hora); sucesso e aviso, `role="status"`.
 */
export function Alert({ message, type = "error", className }: AlertProps) {
  const cfg = CONFIG[type];
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.75 text-(length:--text-caption)",
        cfg.container,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "text-primary-foreground mt-0.25 flex size-4.5 shrink-0 items-center justify-center rounded-full text-(length:--text-micro) font-black",
          cfg.icon,
        )}
      >
        {cfg.icone}
      </span>
      <span>{message}</span>
    </div>
  );
}
