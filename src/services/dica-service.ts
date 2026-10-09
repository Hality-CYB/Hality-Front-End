import { apiClient } from "@/lib/api-client";
import {
  adaptBackendConteudoAdmin,
  backendConteudoAdminSchema,
  blocosDaDica,
  type Dica,
  type DicaInput,
} from "@/types/dica";
import { z } from "zod";

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

/**
 * CRUD de conteúdos do admin (`/admin/conteudos`). A listagem do back não é
 * paginada nem filtrável; o filtro de publicado fica no front.
 */
export const dicaService = {
  async listar(): Promise<Dica[]> {
    const data = await apiClient.get<unknown>("/api/v1/admin/conteudos");
    return z.array(backendConteudoAdminSchema).parse(data).map(adaptBackendConteudoAdmin);
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
