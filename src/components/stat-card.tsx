import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
};

/** Card compacto de indicador numérico (usado nos dashboards). */
export function StatCard({ label, value, icon, color }: StatCardProps) {
  const accent = color ?? "var(--primary)";

  return (
    <Card className="h-full rounded-lg px-3 py-2 shadow-sm ring-0 [--card-spacing:--spacing(1)]">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-[9px]"
        style={{ background: `${accent}15`, color: accent }}
      >
        {icon}
      </div>
      <div className="font-heading text-base leading-none font-extrabold" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-muted-foreground text-[10px] leading-tight wrap-break-word">{label}</div>
    </Card>
  );
}
