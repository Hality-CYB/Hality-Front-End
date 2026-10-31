import { apiClient } from "@/lib/api-client";
import { fusoDoNavegador } from "@/lib/datas";
import { adaptBackendAdminResumo, backendAdminResumoSchema, type ResumoAdmin } from "@/types/admin";

export const adminService = {
  /**
   * `GET /admin/resumo`: sem `inicio`/`fim` o back usa os últimos 30 dias.
   * O fuso é o do navegador, para "hoje" bater com o relógio de quem vê.
   */
  async resumo(periodo: { inicio?: string; fim?: string } = {}): Promise<ResumoAdmin> {
    const params = new URLSearchParams({
      timezone: fusoDoNavegador(),
    });
    if (periodo.inicio) params.set("inicio", periodo.inicio);
    if (periodo.fim) params.set("fim", periodo.fim);
    const data = await apiClient.get<unknown>(`/api/v1/admin/resumo?${params.toString()}`);
    return adaptBackendAdminResumo(backendAdminResumoSchema.parse(data));
  },
};
