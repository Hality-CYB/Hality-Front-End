import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepBarProps = {
  steps: string[];
  current: number;
};

/** Barra de progresso com passos numerados (ex.: Anamnese > Foto > Diagnóstico). */
export function StepBar({ steps, current }: StepBarProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step} className={cn("flex items-center", i < steps.length - 1 ? "flex-1" : "")}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "font-heading flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold transition-colors duration-300",
                i < current
                  ? "bg-green-600 text-white"
                  : i === current
                    ? "bg-primary text-white"
                    : "bg-border text-gray-3",
              )}
            >
              {i < current ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={cn(
                "text-[9px] whitespace-nowrap",
                i <= current ? "text-primary font-bold" : "text-gray-3 font-normal",
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-0.75 mb-3.5 h-0.5 flex-1 transition-colors duration-300",
                i < current ? "bg-green-600" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
