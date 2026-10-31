import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * Estado vazio ("nenhum resultado"), usado nas listas quando um filtro não
 * retorna nada ou um recurso ainda não tem itens.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-13 text-center">
      <div className="bg-background text-gray-3 flex h-15 w-15 items-center justify-center rounded-xl">
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
