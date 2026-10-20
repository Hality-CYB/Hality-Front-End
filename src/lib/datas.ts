/**
 * Datas num lugar só: o fuso que vai para o back e o formato que aparece na tela.
 * O back devolve instantes em ISO 8601; a tela mostra no fuso de quem está vendo.
 */

/** Fuso do navegador (ex.: "America/Sao_Paulo"), para os resumos contarem o "hoje" certo. */
export function fusoDoNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR");
const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** "dd/mm/aaaa". */
export function formatarData(iso: string): string {
  return FORMATO_DATA.format(new Date(iso));
}

/** "dd/mm/aaaa hh:mm". */
export function formatarDataHora(iso: string): string {
  return FORMATO_DATA_HORA.format(new Date(iso));
}
