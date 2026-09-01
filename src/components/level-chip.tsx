import { nivelColor, nivelLabel, type Nivel } from "@/lib/level-format";

type LevelChipProps = {
  nivel: Nivel | null;
  size?: "sm" | "md" | "lg";
};

const PADDING: Record<NonNullable<LevelChipProps["size"]>, string> = {
  sm: "4px 10px",
  md: "6px 14px",
  lg: "8px 18px",
};

const FONT_SIZE: Record<NonNullable<LevelChipProps["size"]>, number> = {
  sm: 11,
  md: 13,
  lg: 15,
};

/** Pill colorido com o nível de halitose (1/2/3) ou "Pendente". */
export function LevelChip({ nivel, size = "md" }: LevelChipProps) {
  const color = nivelColor(nivel);
  return (
    <span
      className="font-heading inline-block rounded-4xl font-bold whitespace-nowrap"
      style={{
        background: `${color}18`,
        color,
        border: `1.5px solid ${color}40`,
        padding: PADDING[size],
        fontSize: FONT_SIZE[size],
      }}
    >
      {nivelLabel(nivel)}
    </span>
  );
}
