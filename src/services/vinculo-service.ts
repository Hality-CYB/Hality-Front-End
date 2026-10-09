import { apiClient } from "@/lib/api-client";
import {
  adaptBackendAdminVinculo,
  adaptBackendAdminVinculoList,
  backendAdminVinculoListSchema,
  backendAdminVinculoSchema,
  type Pagina,
  type Vinculo,
} from "@/types/admin";

export type FiltroVinculos = {
  pagina?: number;
  limite?: number;
  pacienteId?: string;
  profissionalId?: string;
  ativo?: boolean;
};

/** Vínculos paciente↔profissional geridos pelo admin (`/admin/vinculos`, #95 do back). */
export const vinculoService = {
  async listar(filtro: FiltroVinculos = {}): Promise<Pagina<Vinculo>> {
    const params = new URLSearchParams();
    if (filtro.pagina) params.set("pagina", String(filtro.pagina));
    if (filtro.limite) params.set("limite", String(filtro.limite));
    if (filtro.pacienteId) params.set("paciente_id", filtro.pacienteId);
    if (filtro.profissionalId) params.set("profissional_id", filtro.profissionalId);
    if (filtro.ativo !== undefined) params.set("ativo", String(filtro.ativo));
    const query = params.toString();
    const data = await apiClient.get<unknown>(`/api/v1/admin/vinculos${query ? `?${query}` : ""}`);
    return adaptBackendAdminVinculoList(backendAdminVinculoListSchema.parse(data));
  },

  /** 409 se o par já tem vínculo ativo; 422 se algum dos dois não tem o papel certo. */
  async criar(input: { pacienteId: string; profissionalId: string }): Promise<Vinculo> {
    const data = await apiClient.post<unknown>("/api/v1/admin/vinculos", {
      paciente_id: input.pacienteId,
      profissional_id: input.profissionalId,
    });
    return adaptBackendAdminVinculo(backendAdminVinculoSchema.parse(data));
  },

  /** Encerra o vínculo; a linha continua no histórico com `encerrado_em`. */
  async encerrar(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/admin/vinculos/${id}`);
  },
};
