import { apiClient } from "@/lib/api-client";
import {
  adaptBackendDiagnosticoDetail,
  adaptBackendDiagnosticoList,
  backendDiagnosticoCreatedSchema,
  backendDiagnosticoDetailSchema,
  backendDiagnosticoListResponseSchema,
  adaptBackendDiagnosticoProfissional,
  adaptBackendDiagnosticoProfissionalList,
  adaptBackendRevisaoProfissional,
  backendDiagnosticoProfissionalDetalheSchema,
  backendDiagnosticoProfissionalListSchema,
  backendRevisaoProfissionalResponseSchema,
  CODIGO_POR_NIVEL,
  type DiagnosticoProfissional,
  type RevisaoProfissional,
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

export type FiltroDiagnosticosProfissional = FiltroDiagnosticos & { pacienteId?: string };

function queryDoFiltro(filtro: FiltroDiagnosticosProfissional): string {
  const params = new URLSearchParams();
  if (filtro.pacienteId) params.set("paciente_id", filtro.pacienteId);
  if (filtro.status) params.set("status", filtro.status);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);
  if (filtro.pagina) params.set("pagina", String(filtro.pagina));
  if (filtro.limite) params.set("limite", String(filtro.limite));
  if (filtro.ordem) params.set("ordem", filtro.ordem);
  return params.size ? `?${params.toString()}` : "";
}

export const diagnosticoService = {
  /** Diagnósticos do próprio paciente logado. */
  async listar(filtro: FiltroDiagnosticos = {}): Promise<PaginaDiagnosticos> {
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos${queryDoFiltro(filtro)}`);
    return adaptBackendDiagnosticoList(backendDiagnosticoListResponseSchema.parse(data));
  },

  /** Diagnósticos dos pacientes com vínculo ativo com o profissional logado. */
  async listarProfissional(
    filtro: FiltroDiagnosticosProfissional = {},
  ): Promise<PaginaDiagnosticos> {
    const data = await apiClient.get<unknown>(
      `/api/v1/profissional/diagnosticos${queryDoFiltro(filtro)}`,
    );
    return adaptBackendDiagnosticoProfissionalList(
      backendDiagnosticoProfissionalListSchema.parse(data),
    );
  },

  async buscarProfissional(id: string): Promise<DiagnosticoProfissional> {
    const data = await apiClient.get<unknown>(`/api/v1/profissional/diagnosticos/${id}`);
    return adaptBackendDiagnosticoProfissional(
      backendDiagnosticoProfissionalDetalheSchema.parse(data),
    );
  },

  async buscar(id: string): Promise<Diagnostico> {
    const data = await apiClient.get<unknown>(`/api/v1/diagnosticos/${id}`);
    return adaptBackendDiagnosticoDetail(backendDiagnosticoDetailSchema.parse(data));
  },

  /** O titular vem da anamnese: no atendimento pelo profissional, ela já foi criada para o paciente. */
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

  /**
   * Revisão append-only (#100 do back): o revisor vem do token e `versao` é a
   * que o cliente conhecia — se outra revisão entrou antes, o back responde 409.
   */
  async revisar(
    id: string,
    input: { nivel: DiagnosticoNivel; observacoes?: string; versao: number },
  ): Promise<{ revisao: RevisaoProfissional; versao: number }> {
    const data = await apiClient.patch<unknown>(`/api/v1/profissional/diagnosticos/${id}/revisao`, {
      classificacao: CODIGO_POR_NIVEL[input.nivel],
      observacao: input.observacoes?.trim() || null,
      version: input.versao,
    });
    const resposta = backendRevisaoProfissionalResponseSchema.parse(data);
    return {
      revisao: adaptBackendRevisaoProfissional(resposta.revisao),
      versao: resposta.version,
    };
  },
};
