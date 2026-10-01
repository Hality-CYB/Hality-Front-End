import { apiClient } from "@/lib/api-client";
import {
  adaptBackendPacienteDetail,
  adaptBackendPacienteList,
  backendPacienteDetailSchema,
  backendPacienteListResponseSchema,
  type PacienteDetalhe,
  type PaginaPacientes,
} from "@/types/paciente";

export type FiltroPacientes = {
  busca?: string;
  pagina?: number;
  limite?: number;
};

export const pacienteService = {
  async listar(filtro: FiltroPacientes = {}): Promise<PaginaPacientes> {
    const params = new URLSearchParams();
    if (filtro.busca?.trim()) params.set("busca", filtro.busca.trim());
    if (filtro.pagina) params.set("pagina", String(filtro.pagina));
    if (filtro.limite) params.set("limite", String(filtro.limite));
    const query = params.size ? `?${params.toString()}` : "";
    const data = await apiClient.get<unknown>(`/api/v1/pacientes${query}`);
    return adaptBackendPacienteList(backendPacienteListResponseSchema.parse(data));
  },

  async buscar(id: string): Promise<PacienteDetalhe> {
    const data = await apiClient.get<unknown>(`/api/v1/pacientes/${id}`);
    return adaptBackendPacienteDetail(backendPacienteDetailSchema.parse(data));
  },
};
