import { apiClient } from "@/lib/api-client";
import { adaptBackendHome, backendHomeSchema, type HomeData } from "@/types/home";

export const homeService = {
  async buscar(): Promise<HomeData> {
    const data = await apiClient.get<unknown>("/api/v1/home");
    return adaptBackendHome(backendHomeSchema.parse(data));
  },
};
