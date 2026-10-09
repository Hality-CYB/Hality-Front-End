import { z } from "zod";
import { blocoConteudoSchema, type BlocoConteudo } from "@/types/conteudo";

/**
 * Dica = um registro da tabela genérica `conteudos` do back, gerido pelo
 * admin em `/admin/conteudos`. É o mesmo conteúdo que a home do paciente
 * (`GET /home`) e as orientações do diagnóstico leem depois de publicado.
 */

export const CATEGORIAS_DICA = {
  higiene: "Higiene",
  saude: "Saúde",
  nutricao: "Nutrição",
  rotina: "Rotina",
  estilo_de_vida: "Estilo de vida",
  dieta: "Dieta",
  tratamento: "Tratamento",
} as const;
export type CategoriaDica = keyof typeof CATEGORIAS_DICA;
const categoriaDicaSchema = z.enum(
  Object.keys(CATEGORIAS_DICA) as [CategoriaDica, ...CategoriaDica[]],
);

export function categoriaDicaLabel(categoria: string): string {
  return CATEGORIAS_DICA[categoria as CategoriaDica] ?? categoria;
}

/** Espelha `ConteudoDetail` do back. */
export const backendConteudoAdminSchema = z.object({
  id: z.number(),
  titulo: z.string(),
  categoria: categoriaDicaSchema,
  conteudo: z.object({ itens: z.array(blocoConteudoSchema) }),
  classificacao_ids: z.array(z.number()),
  aparece_na_home: z.boolean(),
  status: z.enum(["rascunho", "publicado"]),
  ordem: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  criado_por_id: z.string().nullable(),
  atualizado_por_id: z.string().nullable(),
  publicado_por_id: z.string().nullable(),
  publicado_em: z.string().nullable(),
});
export type BackendConteudoAdmin = z.infer<typeof backendConteudoAdminSchema>;

/**
 * Blocos que o formulário sabe montar. O back aceita qualquer `tipo` de bloco;
 * `imagem` e `video` com `url` + `legenda` são convenção do front. Conteúdo
 * com outro tipo de bloco (ex.: `protocolo_tratamento`, do seed do back) vira
 * "outro" e o formulário não reescreve o corpo dele.
 */
export type FormatoDica = "texto" | "imagem" | "video" | "outro";

export type Dica = {
  id: string;
  titulo: string;
  categoria: CategoriaDica;
  formato: FormatoDica;
  corpo: string;
  midiaUrl?: string;
  blocos: BlocoConteudo[];
  /**
   * Ids da tabela `classificacoes_diagnostico` (no banco real são 11, 12, 13…,
   * não o nível 1-3).
   * TODO(backend): não há rota que liste as classificações (id ↔ código/nível),
   * então o front não consegue mostrar nem escolher em quais níveis a dica
   * aparece. Até existir, a tela só preserva os ids que o conteúdo já tem.
   */
  classificacaoIds: number[];
  mostrarNaHome: boolean;
  publicado: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
};

function formatoDosBlocos(blocos: BlocoConteudo[]): FormatoDica {
  const [primeiro] = blocos;
  if (blocos.length !== 1 || !primeiro) return "outro";
  if (primeiro.tipo === "texto" || primeiro.tipo === "imagem" || primeiro.tipo === "video") {
    return primeiro.tipo;
  }
  return "outro";
}

export function adaptBackendConteudoAdmin(data: BackendConteudoAdmin): Dica {
  const blocos = data.conteudo.itens;
  const formato = formatoDosBlocos(blocos);
  const bloco = blocos[0];
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: String(data.id),
    titulo: data.titulo,
    categoria: data.categoria,
    formato,
    corpo:
      formato === "texto"
        ? texto(bloco?.texto)
        : formato === "outro"
          ? texto(bloco?.descricao) || texto(bloco?.texto)
          : texto(bloco?.legenda),
    midiaUrl:
      formato === "imagem" || formato === "video" ? texto(bloco?.url) || undefined : undefined,
    blocos,
    classificacaoIds: data.classificacao_ids,
    mostrarNaHome: data.aparece_na_home,
    publicado: data.status === "publicado",
    ordem: data.ordem,
    criadoEm: data.created_at,
    atualizadoEm: data.updated_at,
  };
}

/** O que o formulário edita; o corpo só vira blocos quando o formato é conhecido. */
export type DicaInput = {
  titulo: string;
  categoria: CategoriaDica;
  formato: Exclude<FormatoDica, "outro">;
  corpo: string;
  midiaUrl?: string;
  mostrarNaHome: boolean;
  publicado: boolean;
  ordem: number;
};

export function blocosDaDica(input: Pick<DicaInput, "formato" | "corpo" | "midiaUrl">) {
  if (input.formato === "texto") return [{ tipo: "texto", texto: input.corpo.trim() }];
  return [{ tipo: input.formato, url: input.midiaUrl?.trim() ?? "", legenda: input.corpo.trim() }];
}
