import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
};

/** "Check Your Breath" com o tom duplo da marca (teal-900 / teal-700). */
export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span
      className={cn("font-heading font-extrabold", className)}
      style={{ color: "var(--color-teal-900)" }}
    >
      Check <span style={{ color: "var(--color-teal-700)" }}>Your</span> Breath
    </span>
  );
}
