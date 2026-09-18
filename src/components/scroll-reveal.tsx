"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  axis?: "y" | "x";
  className?: string;
};

const INITIAL_LOAD_WINDOW_MS = 100;

/**
 * Revela o conteúdo com fade + deslocamento sutil quando entra na viewport.
 * Sem dependência nova — só IntersectionObserver + CSS transition.
 * Respeita prefers-reduced-motion (mostra direto, sem animar).
 */
export function ScrollReveal({
  children,
  delay = 0,
  duration = 700,
  distance = 24,
  axis = "y",
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef(0);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(reducedMotion);
  const [effectiveDelay, setEffectiveDelay] = useState(delay);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    mountedAtRef.current = performance.now();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const apareceuNoLoadInicial =
            performance.now() - mountedAtRef.current < INITIAL_LOAD_WINDOW_MS;
          setEffectiveDelay(apareceuNoLoadInicial ? delay : 0);
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, delay]);

  const hiddenTransform = axis === "x" ? `translateX(-${distance}px)` : `translateY(${distance}px)`;
  const style: CSSProperties = {
    transitionDuration: `${duration}ms`,
    transitionDelay: `${effectiveDelay}ms`,
    transform: visible ? "translate(0, 0)" : hiddenTransform,
  };

  return (
    <div
      ref={ref}
      className={cn(
        "self-stretch transition-all ease-out",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
