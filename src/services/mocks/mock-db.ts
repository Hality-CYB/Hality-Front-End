import {
  seedConteudos,
  seedDiagnosticos,
  seedPacientes,
  seedProfissionais,
  seedUsuarios,
} from "@/services/mocks/seed-data";
import { nivelLabel } from "@/lib/level-format";
import { CODIGO_POR_NIVEL, type Diagnostico, type DiagnosticoNivel } from "@/types/diagnostico";
import type { BackendConteudoAdmin } from "@/types/dica";
import type { Usuario } from "@/types/usuario";

/**
 * Estado mutável compartilhado entre os handlers que precisam enxergar os
 * mesmos pacientes, vínculos e diagnósticos (um diagnóstico criado pelo
 * profissional precisa aparecer no detalhe do paciente e no resumo).
 */
export const pacientesMock = [...seedPacientes];
export const diagnosticosMock = [...seedDiagnosticos];

/** Todos os usuários (login, `/users/me` e `/admin/usuarios` leem e gravam aqui). */
export const usuariosMock: Usuario[] = [...seedUsuarios];

export type PerfilProfissionalMock = {
  registro: string | null;
  especialidade: string | null;
  vinculadoHality: boolean;
};
export const perfisProfissionaisMock = new Map<string, PerfilProfissionalMock>(
  seedProfissionais.map((p) => [
    p.id,
    {
      registro: p.registroProfissional,
      especialidade: p.especialidade ?? null,
      vinculadoHality: false,
    },
  ]),
);

/** Atualiza o usuário nas duas listas (a de pacientes guarda cópias próprias). */
export function atualizarUsuarioMock(id: string, mudancas: Partial<Usuario>): Usuario | null {
  const index = usuariosMock.findIndex((u) => u.id === id);
  if (index === -1) return null;
  const atualizado = { ...usuariosMock[index]!, ...mudancas };
  usuariosMock[index] = atualizado;
  const indexPaciente = pacientesMock.findIndex((p) => p.id === id);
  if (indexPaciente !== -1) {
    const { role, telefone, ...resto } = mudancas;
    const paciente = pacientesMock[indexPaciente]!;
    if (role && role !== "paciente") pacientesMock.splice(indexPaciente, 1);
    else {
      pacientesMock[indexPaciente] = {
        ...paciente,
        ...resto,
        telefone: telefone === undefined ? paciente.telefone : (telefone ?? ""),
      };
    }
  }
  return atualizado;
}

/**
 * Vínculos paciente↔profissional com histórico, como a tabela
 * `paciente_profissional` do back: encerrar um vínculo não apaga a linha.
 * Os seeds não têm data de vínculo; usa o cadastro do paciente como aproximação.
 */
export type VinculoMock = {
  id: number;
  pacienteId: string;
  profissionalId: string;
  vinculadoEm: string;
  ativo: boolean;
  encerradoEm: string | null;
};
export const vinculosMock: VinculoMock[] = seedPacientes
  .filter((p) => p.profissionalVinculadoId)
  .map((p, index) => ({
    id: index + 1,
    pacienteId: p.id,
    profissionalId: p.profissionalVinculadoId!,
    vinculadoEm: p.criadoEm ?? new Date().toISOString(),
    ativo: true,
    encerradoEm: null,
  }));

export function criarVinculoMock(pacienteId: string, profissionalId: string): VinculoMock {
  const vinculo: VinculoMock = {
    id: Math.max(0, ...vinculosMock.map((v) => v.id)) + 1,
    pacienteId,
    profissionalId,
    vinculadoEm: new Date().toISOString(),
    ativo: true,
    encerradoEm: null,
  };
  vinculosMock.push(vinculo);
  return vinculo;
}

/** Conteúdos (`/admin/conteudos`), também lidos pela home do paciente. */
export const conteudosMock: BackendConteudoAdmin[] = [...seedConteudos];

/** Ids das classificações no banco do mock — no real também não são 1 a 3. */
export const CLASSIFICACAO_ID_POR_NIVEL: Record<DiagnosticoNivel, number> = { 1: 11, 2: 12, 3: 13 };

/**
 * O mock não identifica o paciente logado nos fluxos do próprio paciente:
 * toda autoavaliação pertence a este paciente, como já era antes.
 */
export const PACIENTE_MOCK_ID = "paciente-1";

export function temVinculo(pacienteId: string, profissionalId: string): boolean {
  return vinculosMock.some(
    (v) => v.ativo && v.pacienteId === pacienteId && v.profissionalId === profissionalId,
  );
}

export function pacientesDoProfissional(profissionalId: string) {
  return pacientesMock.filter((p) => temVinculo(p.id, profissionalId));
}

export function nomeDoUsuario(id: string | undefined): string | null {
  if (!id) return null;
  return usuariosMock.find((u) => u.id === id)?.nome ?? null;
}

export const idNumerico = (id: string) => Number(id.replace(/\D/g, ""));

/** Item de `GET /diagnosticos` (listagem do próprio paciente). */
export function paraBackendListItem(d: Diagnostico) {
  return {
    id: idNumerico(d.id),
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao: classificacaoResumo(d.nivel),
    escala_saburra: null,
  };
}

export function classificacaoResumo(nivel: Diagnostico["nivel"]) {
  return nivel !== null
    ? { codigo: CODIGO_POR_NIVEL[nivel], nome_exibicao: nivelLabel(nivel), ordem: nivel }
    : null;
}

export function paginar<T>(itens: T[], pagina: number, limite: number) {
  return {
    itens: itens.slice((pagina - 1) * limite, pagina * limite),
    pagina,
    limite,
    total: itens.length,
    total_paginas: Math.ceil(itens.length / limite),
  };
}

export function maisRecentesPrimeiro(a: { criadoEm: string }, b: { criadoEm: string }) {
  return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
}
