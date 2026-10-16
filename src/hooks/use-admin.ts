"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin-service";

/** Fica sob ["diagnosticos"] para ser invalidado junto quando um diagnóstico muda. */
export function useResumoAdmin() {
  return useQuery({
    queryKey: ["diagnosticos", "admin", "resumo"],
    queryFn: () => adminService.resumo(),
  });
}
