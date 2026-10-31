"use client";

import { useEffect, useRef, useState } from "react";
import { lerLinkDeAcesso, type EstadoLinkDeAcesso } from "@/lib/link-de-acesso";
import type { FinalidadeDoLink } from "@/types/auth";

/**
 * Lê o link do e-mail uma vez, tira `token` e `purpose` da barra de endereço e
 * guarda o token só em memória. Ao sair da página (inclusive pelo cache de
 * navegação), o token é esquecido.
 */
export function useLinkDeAcesso(padrao?: FinalidadeDoLink) {
  const lido = useRef<ReturnType<typeof lerLinkDeAcesso> | null>(null);
  const [estado, setEstado] = useState<EstadoLinkDeAcesso>({
    finalidade: padrao ?? null,
    status: "carregando",
  });

  useEffect(() => {
    let ativo = true;
    // A referência sobrevive ao ciclo extra de efeitos do StrictMode, sem persistência.
    if (!lido.current) {
      const url = new URL(window.location.href);
      lido.current = lerLinkDeAcesso(url, padrao);
      if (
        lido.current.finalidade &&
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
    const { finalidade, status } = lido.current;
    queueMicrotask(() => {
      if (ativo) setEstado({ finalidade, status });
    });
    function esquecer() {
      if (lido.current) lido.current.token = null;
      setEstado((anterior) => ({ ...anterior, status: "ausente" }));
    }
    window.addEventListener("pagehide", esquecer);
    return () => {
      ativo = false;
      window.removeEventListener("pagehide", esquecer);
    };
  }, [padrao]);

  function descartarToken() {
    if (lido.current) lido.current.token = null;
  }

  return { ...estado, lerToken: () => lido.current?.token ?? null, descartarToken };
}
