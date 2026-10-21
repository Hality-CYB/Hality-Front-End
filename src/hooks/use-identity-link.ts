"use client";

import { useEffect, useRef, useState } from "react";
import { readIdentityLink, type IdentityLinkState } from "@/lib/identity-link";
import type { IdentityPurpose } from "@/types/auth";

export function useIdentityLink(fallback?: IdentityPurpose) {
  const captured = useRef<ReturnType<typeof readIdentityLink> | null>(null);
  const [state, setState] = useState<IdentityLinkState>({
    purpose: fallback ?? null,
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    // A referência sobrevive ao ciclo extra de efeitos do StrictMode, sem persistência.
    if (!captured.current) {
      const url = new URL(window.location.href);
      captured.current = readIdentityLink(url, fallback);
      if (
        captured.current.purpose &&
        (url.searchParams.has("token") || url.searchParams.has("purpose"))
      ) {
        url.searchParams.delete("token");
        url.searchParams.delete("purpose");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    }
    const { purpose, status } = captured.current;
    queueMicrotask(() => {
      if (active) setState({ purpose, status });
    });
    function forget() {
      if (captured.current) captured.current.token = null;
      setState((previous) => ({ ...previous, status: "missing" }));
    }
    window.addEventListener("pagehide", forget);
    return () => {
      active = false;
      window.removeEventListener("pagehide", forget);
    };
  }, [fallback]);

  function clearToken() {
    if (captured.current) captured.current.token = null;
  }

  return { ...state, getToken: () => captured.current?.token ?? null, clearToken };
}
