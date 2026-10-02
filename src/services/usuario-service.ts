import { apiClient } from "@/lib/api-client";
import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type Role,
} from "@/types/usuario";
import { z } from "zod";

export type AtualizacaoPerfil = {
  nome?: string;
  telefone?: string;
  profissional?: { registro: string; especialidade: string };
};

export const usuarioService = {
  /** Usuário autenticado (dono do access_token em uso). */
  async buscarAtual(): Promise<Usuario> {
    const data = await apiClient.get<unknown>("/api/v1/users/me");
    return usuarioSchema.parse(adaptBackendUser(backendUserSchema.parse(data)));
  },

  /**
   * `PATCH /users/me` (#93 do back): só nome, telefone e, para o profissional,
   * registro e especialidade. E-mail não é editável — o back recusa com 422.
   */
  async atualizarPerfil(input: AtualizacaoPerfil): Promise<Usuario> {
    const corpo: Record<string, unknown> = {};
    if (input.nome !== undefined) corpo.name = input.nome.trim();
    if (input.telefone !== undefined) corpo.phone = input.telefone.trim() || null;
    if (input.profissional) {
      corpo.profissional = {
        registro_profissional: input.profissional.registro.trim() || null,
        especialidade: input.profissional.especialidade.trim() || null,
      };
    }
    const data = await apiClient.patch<unknown>("/api/v1/users/me", corpo);
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
