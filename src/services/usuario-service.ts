import { apiClient } from "@/lib/api-client";
import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type Role,
} from "@/types/usuario";
import { z } from "zod";

export const usuarioService = {
  /** Usuário autenticado (dono do access_token em uso). */
  async buscarAtual(): Promise<Usuario> {
    const data = await apiClient.get<unknown>("/api/v1/users/me");
    return usuarioSchema.parse(adaptBackendUser(backendUserSchema.parse(data)));
  },

  /** Só usado pelo admin (RF38 — gestão de usuários). */
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
