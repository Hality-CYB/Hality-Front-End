import { z } from "zod";

/**
 * Consentimento por finalidade (US-020, #160 do back). Cada finalidade tem
 * termo versionado e decisão explícita do titular: nada vem marcado por padrão.
 * - `health_data`: tratamento de dados de saúde. Obrigatório para usar o app.
 * - `image_training`: uso da imagem para treinar a IA. Opcional.
 */
export const finalidadeSchema = z.enum(["health_data", "image_training"]);
export type Finalidade = z.infer<typeof finalidadeSchema>;

/** `GET /consentimentos/termos`: texto e versão vigentes de cada finalidade. */
export const backendTermosSchema = z.object({
  itens: z.array(
    z.object({
      finalidade: finalidadeSchema,
      versao: z.string(),
      obrigatorio: z.boolean(),
      titulo: z.string(),
      texto: z.string(),
    }),
  ),
});

export type TermoConsentimento = {
  finalidade: Finalidade;
  versao: string;
  obrigatorio: boolean;
  titulo: string;
  texto: string;
};

export function adaptBackendTermos(
  data: z.infer<typeof backendTermosSchema>,
): TermoConsentimento[] {
  return data.itens;
}

/** Decisão enviada ao back: sempre com a versão do termo que a pessoa viu. */
export type DecisaoConsentimento = { finalidade: Finalidade; versao: string; aceito: boolean };

/** `GET`/`POST /users/me/consentimentos`: estado atual de cada finalidade. */
export const backendConsentimentosSchema = z.object({
  consentimentos: z.array(
    z.object({
      finalidade: finalidadeSchema,
      obrigatorio: z.boolean(),
      versao_vigente: z.string(),
      versao_decidida: z.string().nullable(),
      aceito: z.boolean().nullable(),
      vigente: z.boolean(),
      requer_decisao: z.boolean(),
      decidido_em: z.string().nullable(),
    }),
  ),
  recorded_at: z.string().nullable(),
});

export type EstadoConsentimento = {
  finalidade: Finalidade;
  obrigatorio: boolean;
  versaoVigente: string;
  /** Aceite ou recusa registrados (nulo se nunca decidiu). */
  aceito: boolean | null;
  /** Aceite na versão vigente do termo: só aí o consentimento vale. */
  vigente: boolean;
  /** Nunca decidiu, ou decidiu numa versão antiga do termo. */
  requerDecisao: boolean;
  decididoEm: string | null;
};

export function adaptBackendConsentimentos(
  data: z.infer<typeof backendConsentimentosSchema>,
): EstadoConsentimento[] {
  return data.consentimentos.map((c) => ({
    finalidade: c.finalidade,
    obrigatorio: c.obrigatorio,
    versaoVigente: c.versao_vigente,
    aceito: c.aceito,
    vigente: c.vigente,
    requerDecisao: c.requer_decisao,
    decididoEm: c.decidido_em,
  }));
}
