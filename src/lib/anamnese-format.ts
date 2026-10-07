import type { TipoPergunta } from "@/types/anamnese";

/** O back devolve respostas sim/não como booleano, que chega aqui como "true"/"false". */
export function formatarResposta(tipo: TipoPergunta, valor: string): string {
  if (tipo === "sim_nao") {
    if (valor === "true") return "Sim";
    if (valor === "false") return "Não";
  }
  return valor;
}
