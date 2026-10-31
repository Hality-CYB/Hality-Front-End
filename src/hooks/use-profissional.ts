"use client";

import { useQuery } from "@tanstack/react-query";
import { profissionalService } from "@/services/profissional-service";

export function useResumoProfissional() {
  return useQuery({
    queryKey: ["profissional", "resumo"],
    queryFn: () => profissionalService.resumo(),
  });
}
