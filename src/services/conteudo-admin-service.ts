import { apiClient } from "@/lib/api-client";
import {
  adaptBackendConteudoAdmin,
  backendConteudoAdminSchema,
  backendConteudoListSchema,
  paraBackendConteudo,
  type CategoriaConteudo,
  type ConteudoAdmin,
  type ConteudoAdminInput,
} from "@/types/conteudo-admin";
import {
  backendMidiaEnviadaSchema,
  type DestinoConteudo,
  type MidiaEnviada,
} from "@/types/conteudo";
import type { Pagina } from "@/types/admin";

/** Filtros de `GET /admin/conteudos`; nomes de parâmetro em inglês lá. */
export type FiltroConteudos = {
  pagina?: number;
  limite?: number;
  /** Busca no título. */
  busca?: string;
  publicado?: boolean;
  categoria?: CategoriaConteudo;
  destino?: DestinoConteudo;
  classificacaoId?: number;
  /** Legado, mas pega também conteúdo anterior aos destinos (ver `destinosEfetivos`). */
  mostrarNaHome?: boolean;
  ordem?: "ordem_asc" | "ordem_desc" | "created_at_asc" | "created_at_desc";
};

/** CRUD de conteúdos do admin (`/admin/conteudos`), com listagem paginada e filtrada no back. */
export const conteudoAdminService = {
  async listar(filtro: FiltroConteudos = {}): Promise<Pagina<ConteudoAdmin>> {
    const params = new URLSearchParams();
    if (filtro.pagina) params.set("page", String(filtro.pagina));
    if (filtro.limite) params.set("limit", String(filtro.limite));
    if (filtro.busca?.trim()) params.set("q", filtro.busca.trim());
    if (filtro.publicado !== undefined) {
      params.set("status", filtro.publicado ? "publicado" : "rascunho");
    }
    if (filtro.categoria) params.set("categoria", filtro.categoria);
    if (filtro.destino) params.set("destino", filtro.destino);
    if (filtro.classificacaoId) params.set("classificacao_id", String(filtro.classificacaoId));
    if (filtro.mostrarNaHome !== undefined) {
      params.set("aparece_na_home", String(filtro.mostrarNaHome));
    }
    if (filtro.ordem) params.set("order", filtro.ordem);
    const query = params.toString();
    const data = backendConteudoListSchema.parse(
      await apiClient.get<unknown>(`/api/v1/admin/conteudos${query ? `?${query}` : ""}`),
    );
    return {
      itens: data.items.map(adaptBackendConteudoAdmin),
      pagina: data.page,
      total: data.total,
      totalPaginas: Math.ceil(data.total / data.limit),
    };
  },

  async buscar(id: string): Promise<ConteudoAdmin> {
    const data = await apiClient.get<unknown>(`/api/v1/admin/conteudos/${id}`);
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  async criar(input: ConteudoAdminInput): Promise<ConteudoAdmin> {
    const data = await apiClient.post<unknown>(
      "/api/v1/admin/conteudos",
      paraBackendConteudo(input),
    );
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  /** PATCH parcial: só vai o que foi informado. */
  async atualizar(id: string, input: Partial<ConteudoAdminInput>): Promise<ConteudoAdmin> {
    const data = await apiClient.patch<unknown>(
      `/api/v1/admin/conteudos/${id}`,
      paraBackendConteudo(input),
    );
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  /** Grava a imagem ou o vídeo no back e devolve a URL para o bloco. */
  async enviarMidia(arquivo: File): Promise<MidiaEnviada> {
    const form = new FormData();
    form.append("arquivo", arquivo);
    const data = await apiClient.post<unknown>("/api/v1/admin/conteudos/midias", form);
    return backendMidiaEnviadaSchema.parse(data);
  },

  async remover(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/admin/conteudos/${id}`);
  },
};
