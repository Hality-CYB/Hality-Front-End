import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * Estado vazio ("nenhum resultado"), usado nas listas quando um filtro não
 * retorna nada ou um recurso ainda não tem itens.
 */
export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 text-center",
        compact ? "gap-1.5 py-3" : "gap-3 py-13",
      )}
    >
      <div
        className={cn(
          "bg-background text-gray-3 flex items-center justify-center rounded-xl",
          compact ? "h-8 w-8" : "h-15 w-15",
        )}
      >
        {icon}
      </div>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-70 text-sm leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  );
}
