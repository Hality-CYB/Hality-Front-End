import { apiClient } from "@/lib/api-client";
import { fusoDoNavegador } from "@/lib/datas";
import {
  adaptBackendResumoProfissional,
  backendResumoProfissionalSchema,
  type ResumoProfissional,
} from "@/types/profissional";

/**
 * Rotas do próprio profissional logado. Listar ou buscar profissionais é coisa
 * do admin, por `/admin/usuarios?role=profissional` (usuario-service).
 */
export const profissionalService = {
  /**
   * `GET /profissional/resumo`: sem `inicio`/`fim` o back usa os últimos 30 dias.
   * O fuso vai explícito (o padrão do back é UTC): "hoje" é o do relógio de quem vê.
   */
  async resumo(): Promise<ResumoProfissional> {
    const params = new URLSearchParams({ timezone: fusoDoNavegador() });
    const data = await apiClient.get<unknown>(`/api/v1/profissional/resumo?${params.toString()}`);
    return adaptBackendResumoProfissional(backendResumoProfissionalSchema.parse(data));
  },
};
