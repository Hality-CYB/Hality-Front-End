import { apiClient } from "@/lib/api-client";
import { adaptBackendVinculo, backendVinculoDetailSchema, type Vinculo } from "@/types/vinculo";

export const vinculoService = {
  async vincular(pacienteEmail: string): Promise<Vinculo> {
    const data = await apiClient.post<unknown>("/api/v1/vinculos", {
      paciente_email: pacienteEmail,
    });
    return adaptBackendVinculo(backendVinculoDetailSchema.parse(data));
  },
};
