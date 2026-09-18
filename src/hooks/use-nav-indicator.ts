"use client";

import { useLayoutEffect, useRef, useState, type RefCallback } from "react";

export const NAV_INDICATOR_DURATION_MS = 260;
export const NAV_INDICATOR_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

type IndicatorRect = { x: number; y: number; width: number; height: number };

export function useNavIndicator<T extends HTMLElement = HTMLElement>(activeKey: string) {
  const containerRef = useRef<T | null>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());
  const [rect, setRect] = useState<IndicatorRect | null>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  function registerItem(key: string): RefCallback<HTMLElement> {
    return (el) => {
      if (el) itemsRef.current.set(key, el);
      else itemsRef.current.delete(key);
    };
  }

  function measure() {
    const container = containerRef.current;
    const item = itemsRef.current.get(activeKey);
    if (!container || !item) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setRect({
      x: itemRect.left - containerRect.left,
      y: itemRect.top - containerRect.top,
      width: itemRect.width,
      height: itemRect.height,
    });
  }

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = rect
    ? {
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.width,
        height: rect.height,
        opacity: 1,
        transitionDuration: reducedMotion ? "0ms" : `${NAV_INDICATOR_DURATION_MS}ms`,
        transitionTimingFunction: NAV_INDICATOR_EASING,
        transitionProperty: "transform, width, height",
      }
    : { opacity: 0 };

  return { containerRef, registerItem, style };
}

export function useOptimisticActiveHref(pathname: string, realActiveHref: string | undefined) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activeHref =
    pendingHref !== null && pendingHref !== pathname ? pendingHref : realActiveHref;
  return { activeHref, onNavigate: setPendingHref };
}
