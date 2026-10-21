import { z } from "zod";
import { diagnosticoNivelSchema, type DiagnosticoNivel } from "@/types/diagnostico";

/**
 * `GET /classificacoes`: a tabela de referência das classificações. O `id`
 * muda de banco para banco (11, 12, 13… no real), por isso o front traduz
 * `classificacao_ids` em nível por esta lista, nunca por número fixo.
 */
export const backendClassificacaoSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  nome_exibicao: z.string(),
  ordem: diagnosticoNivelSchema,
});
export const backendClassificacoesSchema = z.array(backendClassificacaoSchema);
export type BackendClassificacao = z.infer<typeof backendClassificacaoSchema>;

export type Classificacao = {
  id: number;
  codigo: string;
  nome: string;
  nivel: DiagnosticoNivel;
};

export function adaptBackendClassificacoes(data: BackendClassificacao[]): Classificacao[] {
  return data.map((c) => ({ id: c.id, codigo: c.codigo, nome: c.nome_exibicao, nivel: c.ordem }));
}
