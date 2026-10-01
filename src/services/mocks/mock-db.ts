import { seedDiagnosticos, seedPacientes, seedUsuarios } from "@/services/mocks/seed-data";
import { nivelLabel } from "@/lib/level-format";
import type { Diagnostico } from "@/types/diagnostico";

/**
 * Estado mutável compartilhado entre os handlers que precisam enxergar os
 * mesmos pacientes, vínculos e diagnósticos (um diagnóstico criado pelo
 * profissional precisa aparecer no detalhe do paciente e no resumo).
 */
export const pacientesMock = [...seedPacientes];
export const diagnosticosMock = [...seedDiagnosticos];

/** Os seeds não têm data de vínculo; usa o cadastro do paciente como aproximação. */
export const vinculadoEmMock = new Map<string, string>(
  seedPacientes
    .filter((p) => p.profissionalVinculadoId)
    .map((p) => [p.id, p.criadoEm ?? new Date().toISOString()]),
);

/**
 * O mock não identifica o paciente logado nos fluxos do próprio paciente:
 * toda autoavaliação pertence a este paciente, como já era antes.
 */
export const PACIENTE_MOCK_ID = "paciente-1";

export function temVinculo(pacienteId: string, profissionalId: string): boolean {
  return pacientesMock.some(
    (p) => p.id === pacienteId && p.profissionalVinculadoId === profissionalId,
  );
}

export function pacientesDoProfissional(profissionalId: string) {
  return pacientesMock.filter((p) => p.profissionalVinculadoId === profissionalId);
}

export function nomeDoUsuario(id: string | undefined): string | null {
  if (!id) return null;
  return seedUsuarios.find((u) => u.id === id)?.nome ?? null;
}

export const idNumerico = (id: string) => Number(id.replace(/\D/g, ""));

/** Item de `GET /diagnosticos`, com o paciente (campo proposto, ver types/diagnostico.ts). */
export function paraBackendListItem(d: Diagnostico, comPaciente = false) {
  const paciente = comPaciente ? pacientesMock.find((p) => p.id === d.pacienteId) : undefined;
  return {
    id: idNumerico(d.id),
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao:
      d.nivel !== null
        ? { codigo: `nivel_${d.nivel}`, nome_exibicao: nivelLabel(d.nivel), ordem: d.nivel }
        : null,
    escala_saburra: null,
    ...(paciente ? { paciente_id: paciente.id, paciente_nome: paciente.nome } : {}),
  };
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
