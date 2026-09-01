import { apiClient } from "@/lib/api-client";
import { usuarioSchema, type Usuario } from "@/types/usuario";
import { z } from "zod";

/** Só usado pelo admin (RF38 — gestão de usuários). */
export const usuarioService = {
  async listar(): Promise<Usuario[]> {
    const data = await apiClient.get<unknown>("/api/v1/usuarios");
    return z.array(usuarioSchema).parse(data);
  },

  async buscar(id: string): Promise<Usuario> {
    const data = await apiClient.get<unknown>(`/api/v1/usuarios/${id}`);
    return usuarioSchema.parse(data);
  },
};
