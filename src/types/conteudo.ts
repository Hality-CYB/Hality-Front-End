import { z } from "zod";

/**
 * Shape do campo `conteudo` (JSONB) da tabela genérica `conteudos` do back
 * (app/models/conteudo.py) — usado tanto no `conteudos` de um diagnóstico
 * (GET /diagnosticos/{id}) quanto nas `dicas` da home (GET /home). Cada
 * bloco tem um `tipo` (ex.: "texto", "protocolo_tratamento") com campos
 * extras que variam por tipo — não modelado campo a campo aqui, só extrai
 * o texto exibível de cada bloco pra renderização.
 */
export const blocoConteudoSchema = z.object({ tipo: z.string() }).catchall(z.unknown());
export type BlocoConteudo = z.infer<typeof blocoConteudoSchema>;

export const backendConteudoSchema = z.object({
  itens: z.array(blocoConteudoSchema).min(1),
});
export type BackendConteudo = z.infer<typeof backendConteudoSchema>;

/** Extrai um texto exibível de cada bloco, campo mais relevante por tipo. */
export function textosDoConteudo(conteudo: BackendConteudo): string[] {
  return conteudo.itens.map((bloco) => {
    if (typeof bloco.texto === "string") return bloco.texto;
    if (typeof bloco.descricao === "string") return bloco.descricao;
    const outros = Object.entries(bloco)
      .filter(([chave]) => chave !== "tipo")
      .map(([, valor]) => String(valor));
    return outros.join(" — ");
  });
}
