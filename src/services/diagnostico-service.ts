import { apiClient } from "@/lib/api-client";
import {
  adaptBackendDiagnosticoDetail,
  adaptBackendDiagnosticoList,
  backendDiagnosticoCreatedSchema,
  backendDiagnosticoDetailSchema,
  backendDiagnosticoListResponseSchema,
  type Diagnostico,
  type DiagnosticoNivel,
  type PaginaDiagnosticos,
  type StatusDiagnostico,
} from "@/types/diagnostico";

export type FiltroDiagnosticos = {
  status?: StatusDiagnostico;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  limite?: number;
  ordem?: "data_desc" | "data_asc";
};

export const diagnosticoService = {
  async listar(filtro: FiltroDiagnosticos = {}): Promise<PaginaDiagnosticos> {
    const params = new URLSearchParams();
    if (filtro.status) params.set("status", filtro.status);
    if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
    if (filtro.dataFim) params.set("data_fim", filtro.dataFim);
    if (filtro.pagina) params.set("pagina", String(filtro.pagina));
    if (filtro.limite) params.set("limite", String(filtro.limite));
    if (filtro.ordem) params.set("ordem", filtro.ordem);
    const query = params.size ? `?${params.toString()}` : "";
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos${query}`);
    return adaptBackendDiagnosticoList(backendDiagnosticoListResponseSchema.parse(data));
  },

  async buscar(id: string): Promise<Diagnostico> {
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos/${id}`);
    return adaptBackendDiagnosticoDetail(backendDiagnosticoDetailSchema.parse(data));
  },

  /** `pacienteId` só no atendimento pelo profissional (PR #91 do back); omitido na autoavaliação. */
  async criar(input: {
    anamneseId: string;
    imagem: File;
    parametrosCaptura: Record<string, unknown>;
    pacienteId?: string;
  }): Promise<{ id: string; status: StatusDiagnostico }> {
    const form = new FormData();
    form.append("anamnese_id", input.anamneseId);
    if (input.pacienteId) form.append("paciente_id", input.pacienteId);
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

  /**
   * TODO(backend): a rota de revisão não existe em nenhuma branch do back.
   * Contrato proposto: o revisor vem do token (nunca do corpo) e a resposta
   * é o mesmo detalhe de `GET /diagnosticos/{id}`, já com `revisao` preenchida.
   */
  async revisar(
    id: string,
    input: { nivel: DiagnosticoNivel; observacoes?: string },
  ): Promise<Diagnostico> {
    const data = await apiClient.put<unknown>(`/api/v1/diagnosticos/${id}/revisar`, {
      nivel: input.nivel,
      observacoes: input.observacoes?.trim() || null,
    });
    return adaptBackendDiagnosticoDetail(backendDiagnosticoDetailSchema.parse(data));
  },
};
