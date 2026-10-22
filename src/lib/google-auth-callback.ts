import {
  codigoTrocaGoogleSchema,
  erroCallbackGoogleSchema,
  etapaGoogleSchema,
  type ErroCallbackGoogle,
} from "@/types/auth-google";

export type RetornoGoogle =
  | { status: "sessao"; codigo: string; etapa: "sessao" }
  | { status: "consentimento"; codigo: string; etapa: "consentimento" }
  | { status: "erro"; erro: ErroCallbackGoogle }
  | { status: "ausente" | "invalido" };

const PARAMETROS_GOOGLE = ["code", "etapa", "erro"] as const;

/**
 * Interpreta o retorno fixo do backend sem tentar adivinhar valores ambíguos.
 * Parâmetros repetidos, misturados ou desconhecidos invalidam o retorno.
 */
export function lerRetornoGoogle(url: URL): RetornoGoogle {
  const codigos = url.searchParams.getAll("code");
  const etapas = url.searchParams.getAll("etapa");
  const erros = url.searchParams.getAll("erro");
  const temParametro = codigos.length > 0 || etapas.length > 0 || erros.length > 0;

  if (!temParametro) return { status: "ausente" };
  if (codigos.length > 1 || etapas.length > 1 || erros.length > 1) {
    return { status: "invalido" };
  }

  if (erros.length === 1) {
    if (codigos.length > 0 || etapas.length > 0) return { status: "invalido" };
    const erro = erroCallbackGoogleSchema.safeParse(erros[0]);
    return erro.success ? { status: "erro", erro: erro.data } : { status: "invalido" };
  }

  if (codigos.length !== 1 || etapas.length !== 1) return { status: "invalido" };
  const codigo = codigoTrocaGoogleSchema.safeParse(codigos[0]);
  const etapa = etapaGoogleSchema.safeParse(etapas[0]);
  if (!codigo.success || !etapa.success) return { status: "invalido" };

  return etapa.data === "sessao"
    ? { status: "sessao", codigo: codigo.data, etapa: etapa.data }
    : { status: "consentimento", codigo: codigo.data, etapa: etapa.data };
}

/** Mantém parâmetros alheios ao login Google e preserva pathname e hash. */
export function removerParametrosDoRetornoGoogle(url: URL): string {
  for (const parametro of PARAMETROS_GOOGLE) url.searchParams.delete(parametro);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function mensagemDoErroCallbackGoogle(erro: ErroCallbackGoogle): string {
  const mensagens: Record<ErroCallbackGoogle, string> = {
    cancelado: "Você cancelou o login com Google. Nenhuma alteração foi feita.",
    estado_invalido: "Não foi possível validar este login. Comece novamente.",
    callback_invalido: "O retorno do Google não pôde ser validado. Comece novamente.",
    erro_provedor: "O Google não conseguiu concluir o login. Tente novamente.",
    provedor_indisponivel: "O login com Google está indisponível agora. Tente mais tarde.",
    identidade_invalida: "Não foi possível confirmar sua identidade pelo Google.",
    email_nao_verificado: "O Google não confirmou que este e-mail foi verificado.",
    conta_existente: "Já existe uma conta com este e-mail. Entre usando e-mail e senha.",
    papel_nao_permitido: "O login com Google está disponível apenas para pacientes.",
    conta_inativa: "Esta conta está inativa. Entre em contato com o suporte.",
  };
  return mensagens[erro];
}
