"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ScoreMeterProps = {
  score: number | null;
  color: string;
  max?: number;
  label?: string;
  delay?: number;
  size?: number;
  className?: string;
};

export function ScoreMeter({
  score,
  color,
  max = 100,
  label,
  delay = 0,
  size = 72,
  className,
}: ScoreMeterProps) {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [animated, setAnimated] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion || score === null) return;
    const timeoutId = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timeoutId);
  }, [reducedMotion, score, delay]);

  const strokeWidth = size * 0.09;
  const r = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  const clamped = score === null ? 0 : Math.min(Math.max(score, 0), max);
  const fraction = score === null ? 0 : clamped / max;
  const targetOffset = circumference * (1 - fraction);
  const offset = score !== null && animated ? targetOffset : circumference;

  const ariaLabel =
    score === null
      ? "Diagnóstico em processamento"
      : `Score ${clamped} de ${max}${label ? ` — ${label}` : ""}`;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {score !== null && (
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: reducedMotion ? "none" : "stroke-dashoffset 600ms ease-out" }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        {score === null ? (
          <span className="text-gray-3 text-sm">···</span>
        ) : (
          <>
            <span className="font-heading text-foreground text-lg leading-none font-extrabold">
              {clamped}
            </span>
            <span className="text-gray-3 mt-0.5 text-[9px] leading-none">score</span>
          </>
        )}
      </div>
    </div>
  );
}
