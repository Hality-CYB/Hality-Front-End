import { z } from "zod";
import { backendConteudoSchema, textosDoConteudo } from "@/types/conteudo";

/**
 * Shape real de GET /api/v1/home (app/schemas/home.py) — a descrição da
 * PR #54 do back documentava `total_diagnosticos`/`avisos_nao_lidos`/
 * `total_dicas` no corpo da resposta, mas o `HomeResponse` de verdade não
 * tem esses campos (confirmado batendo no endpoint real em 2026-09-18).
 * Só usa aqui o que o back realmente devolve.
 */
export const backendHomeSchema = z.object({
  usuario: z.object({ id: z.string(), nome: z.string(), tipo_usuario: z.string() }),
  ultimo_diagnostico: z
    .object({
      id: z.number(),
      data_diagnostico: z.string(),
      status: z.string(),
      classificacao: z.object({ codigo: z.string(), nome_exibicao: z.string() }).nullable(),
      escala_saburra: z.number().nullable(),
    })
    .nullable(),
  dicas: z.array(
    z.object({
      id: z.number(),
      titulo: z.string(),
      categoria: z.string(),
      conteudo: backendConteudoSchema,
    }),
  ),
});
export type BackendHome = z.infer<typeof backendHomeSchema>;

export type DicaHome = {
  id: string;
  titulo: string;
  categoria: string;
  textos: string[];
};

export type HomeData = {
  usuarioNome: string;
  dicas: DicaHome[];
};

export function adaptBackendHome(data: BackendHome): HomeData {
  return {
    usuarioNome: data.usuario.nome,
    dicas: data.dicas.map((dica) => ({
      id: String(dica.id),
      titulo: dica.titulo,
      categoria: dica.categoria,
      textos: textosDoConteudo(dica.conteudo),
    })),
  };
}
