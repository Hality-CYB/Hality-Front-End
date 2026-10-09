import { apiClient } from "@/lib/api-client";
import {
  usuarioSchema,
  backendUserSchema,
  adaptBackendUser,
  type Usuario,
  type Role,
} from "@/types/usuario";
import {
  adaptBackendAdminUsuario,
  adaptBackendAdminUsuarioList,
  backendAdminUsuarioListSchema,
  backendAdminUsuarioSchema,
  type Pagina,
} from "@/types/admin";

export type FiltroUsuariosAdmin = {
  pagina?: number;
  limite?: number;
  role?: Role;
  ativo?: boolean;
  busca?: string;
};

export type NovoUsuarioAdmin = {
  nome: string;
  email: string;
  telefone?: string;
  role: Role;
  senha: string;
  profissional?: { registro: string; especialidade: string; vinculadoHality: boolean };
};

export type AtualizacaoUsuarioAdmin = {
  nome?: string;
  telefone?: string;
  role?: Role;
  ativo?: boolean;
};

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

  /**
   * `PATCH /users/me/senha` (#104 do back): 204 se trocou, 400 se a senha
   * atual não confere. `PATCH /users/me` não aceita senha (422).
   */
  async alterarSenha(input: { senhaAtual: string; novaSenha: string }): Promise<void> {
    await apiClient.patch<void>("/api/v1/users/me/senha", {
      senha_atual: input.senhaAtual,
      nova_senha: input.novaSenha,
    });
  },

  // --- Admin (`/admin/usuarios` e `/admin/profissionais`) ---

  async listarAdmin(filtro: FiltroUsuariosAdmin = {}): Promise<Pagina<Usuario>> {
    const params = new URLSearchParams();
    if (filtro.pagina) params.set("pagina", String(filtro.pagina));
    if (filtro.limite) params.set("limite", String(filtro.limite));
    if (filtro.role) params.set("role", filtro.role);
    if (filtro.ativo !== undefined) params.set("ativo", String(filtro.ativo));
    if (filtro.busca?.trim()) params.set("busca", filtro.busca.trim());
    const query = params.toString();
    const data = await apiClient.get<unknown>(`/api/v1/admin/usuarios${query ? `?${query}` : ""}`);
    return adaptBackendAdminUsuarioList(backendAdminUsuarioListSchema.parse(data));
  },

  async buscarAdmin(id: string): Promise<Usuario> {
    const data = await apiClient.get<unknown>(`/api/v1/admin/usuarios/${id}`);
    return adaptBackendAdminUsuario(backendAdminUsuarioSchema.parse(data));
  },

  /** 409 se o e-mail já existe. `profissional` só é aceito com role profissional. */
  async criarAdmin(input: NovoUsuarioAdmin): Promise<Usuario> {
    const data = await apiClient.post<unknown>("/api/v1/admin/usuarios", {
      nome: input.nome.trim(),
      email: input.email.trim(),
      telefone: input.telefone?.trim() || null,
      role: input.role,
      senha: input.senha,
      ...(input.role === "profissional" && input.profissional
        ? {
            profissional: {
              registro_profissional: input.profissional.registro.trim() || null,
              especialidade: input.profissional.especialidade.trim() || null,
              vinculado_hality: input.profissional.vinculadoHality,
            },
          }
        : {}),
    });
    return adaptBackendAdminUsuario(backendAdminUsuarioSchema.parse(data));
  },

  /**
   * Nome, telefone, papel e ativo. E-mail e senha não são editáveis por aqui
   * (o back recusa com 422). 409 se a mudança deixaria o sistema sem admin ativo.
   */
  async atualizarAdmin(id: string, input: AtualizacaoUsuarioAdmin): Promise<Usuario> {
    const corpo: Record<string, unknown> = {};
    if (input.nome !== undefined) corpo.nome = input.nome.trim();
    if (input.telefone !== undefined) corpo.telefone = input.telefone.trim() || null;
    if (input.role !== undefined) corpo.role = input.role;
    if (input.ativo !== undefined) corpo.ativo = input.ativo;
    const data = await apiClient.patch<unknown>(`/api/v1/admin/usuarios/${id}`, corpo);
    return adaptBackendAdminUsuario(backendAdminUsuarioSchema.parse(data));
  },

  async atualizarProfissionalAdmin(
    id: string,
    input: { registro: string; especialidade: string; vinculadoHality: boolean },
  ): Promise<Usuario> {
    const data = await apiClient.patch<unknown>(`/api/v1/admin/profissionais/${id}`, {
      registro_profissional: input.registro.trim() || null,
      especialidade: input.especialidade.trim() || null,
      vinculado_hality: input.vinculadoHality,
    });
    return adaptBackendAdminUsuario(backendAdminUsuarioSchema.parse(data));
  },
};
