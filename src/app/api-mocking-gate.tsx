"use client";

import { useEffect, useState, type ReactNode } from "react";
import { config } from "@/lib/config";

/**
 * Promise em nível de módulo — garante que `worker.start()` só é chamado
 * uma única vez de verdade, mesmo com o efeito abaixo disparando 2x (Strict
 * Mode do React, ativado por padrão no Next em dev). Chamar start() duas
 * vezes faz o MSW lançar "cannot configure an already enabled network" na
 * segunda chamada — esse cache evita a segunda chamada acontecer.
 */
let startPromise: Promise<unknown> | null = null;

function ensureWorkerStarted(): Promise<unknown> {
  if (!startPromise) {
    startPromise = import("@/services/mocks/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }),
    );
  }
  return startPromise;
}

/**
 * Segura a renderização até o service worker do MSW estar registrado —
 * evita a corrida onde um componente já monta e dispara um fetch real
 * antes dos handlers de mock estarem interceptando. Import dinâmico pra
 * `msw/browser` nunca entrar no bundle de produção quando o mocking
 * estiver desligado.
 */
export function ApiMockingGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!config.apiMocking);

  useEffect(() => {
    if (!config.apiMocking) return;

    let cancelled = false;
    ensureWorkerStarted().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return children;
}
