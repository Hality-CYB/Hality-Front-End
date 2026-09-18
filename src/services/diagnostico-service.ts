import { apiClient } from "@/lib/api-client";
import {
  adaptBackendDiagnosticoDetail,
  backendDiagnosticoCreatedSchema,
  backendDiagnosticoDetailSchema,
  diagnosticoSchema,
  type Diagnostico,
  type DiagnosticoNivel,
  type StatusDiagnostico,
} from "@/types/diagnostico";
import { z } from "zod";

export const diagnosticoService = {
  async listar(filtro?: {
    pacienteId?: string;
    profissionalId?: string;
    status?: string;
  }): Promise<Diagnostico[]> {
    const params = new URLSearchParams();
    if (filtro?.pacienteId) params.set("pacienteId", filtro.pacienteId);
    if (filtro?.profissionalId) params.set("profissionalId", filtro.profissionalId);
    if (filtro?.status) params.set("status", filtro.status);
    const query = params.size ? `?${params.toString()}` : "";
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos${query}`);
    return z.array(diagnosticoSchema).parse(data);
  },

  async buscar(id: string): Promise<Diagnostico> {
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos/${id}`);
    return adaptBackendDiagnosticoDetail(backendDiagnosticoDetailSchema.parse(data));
  },

  async criar(input: {
    anamneseId: string;
    imagem: File;
    parametrosCaptura: Record<string, unknown>;
  }): Promise<{ id: string; status: StatusDiagnostico }> {
    const form = new FormData();
    form.append("anamnese_id", input.anamneseId);
    form.append("imagem", input.imagem);
    form.append("parametros_captura", JSON.stringify(input.parametrosCaptura));
    const data = await apiClient.post<unknown>("/api/v1/diagnosticos", form);
    const criado = backendDiagnosticoCreatedSchema.parse(data);
    return { id: String(criado.id), status: criado.status };
  },

  async aguardarResultado(
    id: string,
    { intervaloMs = 1000, tentativas = 15 }: { intervaloMs?: number; tentativas?: number } = {},
  ): Promise<Diagnostico> {
    for (let i = 0; i < tentativas; i++) {
      const diagnostico = await diagnosticoService.buscar(id);
      if (diagnostico.status !== "processando") return diagnostico;
      await new Promise((resolve) => setTimeout(resolve, intervaloMs));
    }
    throw new Error("A análise está demorando mais que o esperado.");
  },

  async revisar(
    id: string,
    input: { nivel: DiagnosticoNivel; revisadoPor: string },
  ): Promise<Diagnostico> {
    const data = await apiClient.put<unknown>(`/api/v1/diagnosticos/${id}/revisar`, input);
    return diagnosticoSchema.parse(data);
  },
};
