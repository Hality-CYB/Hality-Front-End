import { apiClient } from "@/lib/api-client";
import {
  adaptBackendPacienteDetail,
  adaptBackendPacienteList,
  backendPacienteCriadoSchema,
  backendPacienteDetailSchema,
  backendPacienteListResponseSchema,
  type PacienteDetalhe,
  type PacienteCriado,
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

  /**
   * Cadastro simples pelo profissional (#101 do back). Sem `senha`, o back cria a
   * conta com uma senha provisória padrão, que o paciente deve trocar depois.
   */
  async criar(input: NovoPaciente): Promise<PacienteCriado> {
    const data = await apiClient.post<unknown>("/api/v1/pacientes", {
      nome: input.nome.trim(),
      email: input.email.trim(),
      telefone: input.telefone?.trim() || null,
    });
    const criado = backendPacienteCriadoSchema.parse(data);
    return {
      pacienteId: criado.paciente_id,
      nome: criado.paciente_nome,
      email: criado.paciente_email,
    };
  },
};
