import { z } from "zod";
import type { DecisaoConsentimento } from "@/types/consentimento";

/** Etapa indicada pelo callback do back ao devolver o navegador ao frontend. */
export const etapaGoogleSchema = z.enum(["sessao", "consentimento"]);
export type EtapaGoogle = z.infer<typeof etapaGoogleSchema>;

/** Erros públicos que o callback pode informar sem expor dados do provedor. */
export const erroCallbackGoogleSchema = z.enum([
  "cancelado",
  "estado_invalido",
  "callback_invalido",
  "erro_provedor",
  "provedor_indisponivel",
  "identidade_invalida",
  "email_nao_verificado",
  "conta_existente",
  "papel_nao_permitido",
  "conta_inativa",
]);
export type ErroCallbackGoogle = z.infer<typeof erroCallbackGoogleSchema>;

/** Código temporário, de uso único, recebido após o callback do Google. */
export const codigoTrocaGoogleSchema = z.string().min(1).max(2048);

/** Mesmo formato de sessão retornado pelo login com e-mail e senha. */
export const respostaSessaoGoogleSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
});

export type TrocaCodigoGoogleInput = {
  codigo: string;
  consentimentos?: DecisaoConsentimento[];
};
