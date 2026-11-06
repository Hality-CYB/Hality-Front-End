// palavras que ficam no meio do nome, tipo da, de, do
const LIGACOES = ["da", "de", "do", "das", "dos", "e"];

// nome curto pra saudação: os 2 primeiros nomes
// se o segundo for uma ligação (cleiton da silva), leva o próximo também
export function nomeDaSaudacao(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const segundo = partes[1]?.toLowerCase() ?? "";
  const quantidade = LIGACOES.includes(segundo) ? 3 : 2;
  return partes.slice(0, quantidade).join(" ");
}
