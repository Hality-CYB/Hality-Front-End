import { apiClient } from "@/lib/api-client";
import {
  adaptBackendPacienteDetail,
  adaptBackendPacienteItem,
  adaptBackendPacienteList,
  backendPacienteCriadoSchema,
  backendPacienteDetailSchema,
  backendPacienteListResponseSchema,
  type PacienteDetalhe,
  type PacienteResumo,
  type PaginaPacientes,
} from "@/types/paciente";

export type FiltroPacientes = {
  busca?: string;
  pagina?: number;
  limite?: number;
};

export type NovoPaciente = {
  nome: string;
  email: string;
  telefone?: string;
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

  /** Cadastro simples pelo profissional, que já sai vinculado a ele. Ver TODO em types/paciente.ts. */
  async criar(input: NovoPaciente): Promise<PacienteResumo> {
    const data = await apiClient.post<unknown>("/api/v1/pacientes", {
      nome: input.nome,
      email: input.email,
      telefone: input.telefone || null,
    });
    return adaptBackendPacienteItem(backendPacienteCriadoSchema.parse(data));
  },
};
