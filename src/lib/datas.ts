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

/** Hoje no calendário de quem está vendo, em "aaaa-mm-dd" (o formato do `<input type="date">`). */
export function hojeNoCalendario(agora = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * O que impede usar a data de nascimento ("aaaa-mm-dd"), com as mesmas regras do
 * back: obrigatória, não pode estar no futuro nem ser anterior a 1900.
 */
export function problemaDaDataDeNascimento(valor: string, agora = new Date()): string | null {
  if (!valor) return "Informe a data de nascimento.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "Data de nascimento inválida.";
  if (valor > hojeNoCalendario(agora)) return "A data de nascimento não pode estar no futuro.";
  if (valor < "1900-01-01") return "Confira o ano da data de nascimento.";
  return null;
}

/** Idade completa em anos, a partir de "aaaa-mm-dd". */
export function idadeEmAnos(dataNascimento: string, agora = new Date()): number {
  const [ano, mes, dia] = dataNascimento.split("-").map(Number) as [number, number, number];
  const fezAniversario =
    agora.getMonth() + 1 > mes || (agora.getMonth() + 1 === mes && agora.getDate() >= dia);
  return agora.getFullYear() - ano - (fezAniversario ? 0 : 1);
}

/** "dd/mm/aaaa" de uma data sem horário ("aaaa-mm-dd"), sem passar por fuso. */
export function formatarDataSemHorario(valor: string): string {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}
