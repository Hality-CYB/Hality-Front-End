"use client";

import { useQuery } from "@tanstack/react-query";
import { homeService } from "@/services/home-service";

export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: homeService.buscar,
  });
}
