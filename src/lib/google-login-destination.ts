const DESTINO_PADRAO_GOOGLE = "/paciente";
const DESTINO_STORAGE_KEY = "hality:google_return_to";
const ORIGEM_DE_VALIDACAO = "https://hality.local";

/**
 * Aceita somente rotas internas da área do paciente. `URL` também normaliza
 * tentativas como `/paciente/../admin` e identifica URLs iniciadas por `//`.
 */
export function normalizarDestinoPaciente(destino: string): string | null {
  try {
    const url = new URL(destino, ORIGEM_DE_VALIDACAO);
    const estaNaOrigem = url.origin === ORIGEM_DE_VALIDACAO;
    const estaNaAreaDoPaciente =
      url.pathname === DESTINO_PADRAO_GOOGLE || url.pathname.startsWith("/paciente/");

    if (!estaNaOrigem || !estaNaAreaDoPaciente) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Sem destino explícito, o login Google continua levando à home do paciente. */
export function destinoGoogleParaRedirect(redirect: string | null): string | null {
  return redirect === null ? DESTINO_PADRAO_GOOGLE : normalizarDestinoPaciente(redirect);
}

export function guardarDestinoLoginGoogle(destino: string): void {
  if (typeof window === "undefined") return;
  const seguro = normalizarDestinoPaciente(destino);
  if (seguro) window.sessionStorage.setItem(DESTINO_STORAGE_KEY, seguro);
  else window.sessionStorage.removeItem(DESTINO_STORAGE_KEY);
}

/** Lê, valida novamente e apaga o destino para que outro login não o reutilize. */
export function consumirDestinoLoginGoogle(): string {
  if (typeof window === "undefined") return DESTINO_PADRAO_GOOGLE;
  const salvo = window.sessionStorage.getItem(DESTINO_STORAGE_KEY);
  window.sessionStorage.removeItem(DESTINO_STORAGE_KEY);
  return (salvo && normalizarDestinoPaciente(salvo)) || DESTINO_PADRAO_GOOGLE;
}

export function limparDestinoLoginGoogle(): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(DESTINO_STORAGE_KEY);
}
