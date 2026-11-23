"use client";

import { useSyncExternalStore } from "react";

/** Mesmo corte do `--breakpoint-shell` (860px) do globals.css. */
const CONSULTA_CELULAR = "(max-width: 859.98px)";

function consulta(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(CONSULTA_CELULAR)
    : null;
}

function assinar(avisar: () => void) {
  const lista = consulta();
  lista?.addEventListener("change", avisar);
  return () => lista?.removeEventListener("change", avisar);
}

/**
 * Se a tela está no layout de celular (abaixo do `shell`). Lê o valor já no
 * primeiro render do cliente, para não montar a tela de novo logo depois — o que
 * faria o `<video>` da câmera perder o stream. Sem `matchMedia` (testes), é desktop.
 */
export function useLayoutCelular(): boolean {
  return useSyncExternalStore(
    assinar,
    () => consulta()?.matches ?? false,
    () => false,
  );
}
