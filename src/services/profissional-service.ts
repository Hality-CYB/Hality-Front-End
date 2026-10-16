import { apiClient } from "@/lib/api-client";
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
  async resumo(): Promise<ResumoProfissional> {
    const data = await apiClient.get<unknown>("/api/v1/profissional/resumo");
    return adaptBackendResumoProfissional(backendResumoProfissionalSchema.parse(data));
  },
};
