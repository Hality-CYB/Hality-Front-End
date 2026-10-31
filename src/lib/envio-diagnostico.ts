import { ApiError } from "@/lib/api-client";

/**
 * Regras do envio de diagnóstico que decidem o que a tela faz depois de um erro
 * (TASK-208): continuar de onde parou, pedir outra foto ou levar ao consentimento.
 */

/** A IA terminou em falha: só uma foto nova resolve (a anamnese já foi usada). */
export class FalhaNaAnalise extends Error {}

/** Define o que a tela de erro oferece: tentar de novo, outra foto ou o consentimento. */
export type TipoErro = "rede" | "foto" | "consentimento";

export function tipoDoErro(erro: unknown): TipoErro {
  if (erro instanceof FalhaNaAnalise) return "foto";
  if (erro instanceof ApiError) {
    if (erro.status === 403) return "consentimento";
    if (erro.status === 413 || erro.status === 415 || erro.status === 422) return "foto";
  }
  return "rede";
}

/**
 * `POST /diagnosticos` com uma anamnese que já tem diagnóstico responde 409 com
 * o `diagnostico_id` existente (#164 do back): é um reenvio, não um erro.
 */
export function idDoDiagnosticoExistente(erro: unknown): string | null {
  if (!(erro instanceof ApiError) || erro.status !== 409) return null;
  try {
    const corpo = JSON.parse(erro.message) as { diagnostico_id?: unknown };
    return corpo.diagnostico_id == null ? null : String(corpo.diagnostico_id);
  } catch {
    return null;
  }
}
