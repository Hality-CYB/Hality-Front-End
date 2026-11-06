import { tokenDoLinkSchema, type FinalidadeDoLink } from "@/types/auth";

export type EstadoLinkDeAcesso = {
  finalidade: FinalidadeDoLink | null;
  status: "carregando" | "ausente" | "invalido" | "pronto";
};

/** Valores de `purpose` que o back põe no link do e-mail. */
const FINALIDADE_DO_BACK: Record<string, FinalidadeDoLink> = {
  invitation: "convite",
  password_reset: "recuperacao",
  email_verification: "confirmacao_email",
};

/**
 * Lê `?purpose=invitation|password_reset|email_verification&token=...` (contrato da #157 do back)
 * sem decodificar o token. Parâmetro repetido ou desconhecido invalida o link,
 * em vez de adivinhar o fluxo.
 */
export function lerLinkDeAcesso(url: URL, padrao?: FinalidadeDoLink) {
  const finalidades = url.searchParams.getAll("purpose");
  const tokens = url.searchParams.getAll("token");
  const explicita = finalidades.map((v) => FINALIDADE_DO_BACK[v]).find(Boolean);
  const finalidade = explicita ?? padrao ?? null;
  if (!finalidade) return { finalidade: null, status: "ausente" as const, token: null };
  if (finalidades.length > 1 || tokens.length > 1 || (finalidades.length > 0 && !explicita)) {
    return { finalidade, status: "invalido" as const, token: null };
  }
  if (!tokens.length || !tokens[0]) return { finalidade, status: "ausente" as const, token: null };
  if (!tokenDoLinkSchema.safeParse(tokens[0]).success) {
    return { finalidade, status: "invalido" as const, token: null };
  }
  return { finalidade, status: "pronto" as const, token: tokens[0] };
}
