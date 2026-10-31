"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { HealthStatus } from "@/types/health";

/**
 * Exemplo de hook: busca o status do backend (GET /api/v1/health) ao montar.
 * Serve de referência de padrão — hooks concentram lógica de estado/efeito
 * ligada ao React; regra de negócio mais complexa entra em `services/`.
 */
export function useHealth() {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    apiClient
      .get<HealthStatus>("/api/v1/health")
      .then(setData)
      .catch((err: Error) => setError(err));
  }, []);

  return { data, error };
}
