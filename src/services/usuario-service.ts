import { apiClient } from "@/lib/api-client";
import { usuarioSchema, type Usuario, type Role } from "@/types/usuario";
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

  async criar(input: { nome: string; email: string; role: Role }): Promise<Usuario> {
    const data = await apiClient.post<unknown>("/api/v1/usuarios", input);
    return usuarioSchema.parse(data);
  },
};
