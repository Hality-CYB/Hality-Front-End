import { apiClient } from "@/lib/api-client";
import {
  adaptBackendConteudoAdmin,
  backendConteudoAdminSchema,
  blocosDaDica,
  type CategoriaDica,
  type Dica,
  type DicaInput,
} from "@/types/dica";
import type { Pagina } from "@/types/admin";
import { z } from "zod";

/** Filtros de `GET /admin/conteudos` (#144 do back); nomes de parâmetro em inglês lá. */
export type FiltroDicas = {
  pagina?: number;
  limite?: number;
  /** Busca no título. */
  busca?: string;
  publicado?: boolean;
  categoria?: CategoriaDica;
  mostrarNaHome?: boolean;
  ordem?: "ordem_asc" | "ordem_desc" | "created_at_asc" | "created_at_desc";
};

const backendConteudoListSchema = z.object({
  items: z.array(backendConteudoAdminSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  has_next: z.boolean(),
});

function corpoDoConteudo(input: Partial<DicaInput>): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};
  if (input.titulo !== undefined) corpo.titulo = input.titulo.trim();
  if (input.categoria !== undefined) corpo.categoria = input.categoria;
  if (input.formato !== undefined && input.corpo !== undefined) {
    corpo.conteudo = {
      itens: blocosDaDica({ ...input, formato: input.formato, corpo: input.corpo }),
    };
  }
  if (input.mostrarNaHome !== undefined) corpo.aparece_na_home = input.mostrarNaHome;
  if (input.publicado !== undefined) corpo.status = input.publicado ? "publicado" : "rascunho";
  if (input.ordem !== undefined) corpo.ordem = input.ordem;
  return corpo;
}

/** CRUD de conteúdos do admin (`/admin/conteudos`), com listagem paginada e filtrada no back. */
export const dicaService = {
  async listar(filtro: FiltroDicas = {}): Promise<Pagina<Dica>> {
    const params = new URLSearchParams();
    if (filtro.pagina) params.set("page", String(filtro.pagina));
    if (filtro.limite) params.set("limit", String(filtro.limite));
    if (filtro.busca?.trim()) params.set("q", filtro.busca.trim());
    if (filtro.publicado !== undefined) {
      params.set("status", filtro.publicado ? "publicado" : "rascunho");
    }
    if (filtro.categoria) params.set("categoria", filtro.categoria);
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

  async buscar(id: string): Promise<Dica> {
    const data = await apiClient.get<unknown>(`/api/v1/admin/conteudos/${id}`);
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  async criar(input: DicaInput): Promise<Dica> {
    const data = await apiClient.post<unknown>("/api/v1/admin/conteudos", corpoDoConteudo(input));
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  /** PATCH parcial: só vai o que mudou (o corpo só se formato e texto vierem juntos). */
  async atualizar(id: string, input: Partial<DicaInput>): Promise<Dica> {
    const data = await apiClient.patch<unknown>(
      `/api/v1/admin/conteudos/${id}`,
      corpoDoConteudo(input),
    );
    return adaptBackendConteudoAdmin(backendConteudoAdminSchema.parse(data));
  },

  async remover(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/admin/conteudos/${id}`);
  },
};
