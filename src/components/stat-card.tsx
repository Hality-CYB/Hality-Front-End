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
    <Card className="rounded-lg p-5 shadow-sm ring-0">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-[13px]"
        style={{ background: `${accent}15`, color: accent }}
      >
        {icon}
      </div>
      <div
        className="font-heading text-[26px] leading-none font-extrabold"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">{label}</div>
    </Card>
  );
}
