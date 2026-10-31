import { cn } from "@/lib/utils";

type GuiaCapturaProps = {
  mascara?: boolean;
};

export function GuiaCaptura({ mascara = true }: GuiaCapturaProps) {
  return (
    <div
      aria-hidden
      data-testid="guia-captura"
      className="[container-type:size] pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className={cn(
          "absolute top-[56%] left-1/2 aspect-[4/5] w-[min(46cqh,56cqw)] -translate-x-1/2 -translate-y-1/2",
          "rounded-[48%_48%_50%_50%/34%_34%_66%_66%] border-2 border-white/90",
          mascara && "guia-lingua-mascara",
        )}
      >
        <svg
          viewBox="0 0 100 125"
          preserveAspectRatio="none"
          fill="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path
            d="M 50 24 L 50 104"
            stroke="white"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
