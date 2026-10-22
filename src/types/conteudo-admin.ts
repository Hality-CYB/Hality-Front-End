import { z } from "zod";
import {
  blocoConteudoSchema,
  destinoConteudoSchema,
  ehBlocoEditavel,
  type BlocoConteudo,
  type BlocoEditavel,
  type DestinoConteudo,
} from "@/types/conteudo";

/**
 * Conteúdo da tabela genérica `conteudos` do back, gerido pelo admin em
 * `/admin/conteudos`. Depois de publicado, aparece em cada destino escolhido:
 * home do paciente, orientações do diagnóstico, captura da foto ou landing.
 */

export const CATEGORIAS_CONTEUDO = {
  higiene: "Higiene",
  saude: "Saúde",
  nutricao: "Nutrição",
  rotina: "Rotina",
  estilo_de_vida: "Estilo de vida",
  dieta: "Dieta",
  tratamento: "Tratamento",
} as const;
export type CategoriaConteudo = keyof typeof CATEGORIAS_CONTEUDO;
export const categoriaConteudoSchema = z.enum(
  Object.keys(CATEGORIAS_CONTEUDO) as [CategoriaConteudo, ...CategoriaConteudo[]],
);

export function categoriaConteudoLabel(categoria: string): string {
  return CATEGORIAS_CONTEUDO[categoria as CategoriaConteudo] ?? categoria;
}

/** Espelha `ConteudoDetail` do back. */
export const backendConteudoAdminSchema = z.object({
  id: z.number(),
  titulo: z.string(),
  categoria: categoriaConteudoSchema,
  conteudo: z.object({ itens: z.array(blocoConteudoSchema) }),
  classificacao_ids: z.array(z.number()),
  destinos: z.array(destinoConteudoSchema),
  /** Legado: o back mantém sincronizado com o destino `home_autenticada`. */
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

/** `GET /admin/conteudos` paginado (nomes em inglês lá). */
export const backendConteudoListSchema = z.object({
  items: z.array(backendConteudoAdminSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  has_next: z.boolean(),
});

export type ConteudoAdmin = {
  id: string;
  titulo: string;
  categoria: CategoriaConteudo;
  /** Na ordem de exibição. Tipos que o editor não monta vêm como estão. */
  blocos: BlocoConteudo[];
  /** Ids de `GET /classificacoes`, não o nível. */
  classificacaoIds: number[];
  /** Onde o conteúdo aparece hoje, inclusive pelas regras legadas (ver `destinosEfetivos`). */
  destinos: DestinoConteudo[];
  publicado: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
};

/**
 * Conteúdo anterior aos destinos (#161) tem `destinos` vazio, e o back ainda o
 * entrega pelas regras antigas: `aparece_na_home` leva à home, e ter
 * classificação leva às orientações. O formulário mostra o que vale de fato e,
 * ao salvar, grava os destinos explicitamente.
 */
export function destinosEfetivos(
  data: Pick<BackendConteudoAdmin, "destinos" | "aparece_na_home" | "classificacao_ids">,
): DestinoConteudo[] {
  if (data.destinos.length > 0) return data.destinos;
  const destinos: DestinoConteudo[] = [];
  if (data.aparece_na_home) destinos.push("home_autenticada");
  if (data.classificacao_ids.length > 0) destinos.push("orientacoes_diagnostico");
  return destinos;
}

export function adaptBackendConteudoAdmin(data: BackendConteudoAdmin): ConteudoAdmin {
  return {
    id: String(data.id),
    titulo: data.titulo,
    categoria: data.categoria,
    blocos: data.conteudo.itens,
    classificacaoIds: data.classificacao_ids,
    destinos: destinosEfetivos(data),
    publicado: data.status === "publicado",
    ordem: data.ordem,
    criadoEm: data.created_at,
    atualizadoEm: data.updated_at,
  };
}

/** O que o formulário salva. */
export type ConteudoAdminInput = {
  titulo: string;
  categoria: CategoriaConteudo;
  blocos: BlocoConteudo[];
  destinos: DestinoConteudo[];
  classificacaoIds: number[];
  publicado: boolean;
  ordem: number;
};

/** Tira espaços; a imagem só leva `alt` se já tinha. */
function limparBloco(bloco: BlocoEditavel): BlocoEditavel {
  if (bloco.tipo === "texto") return { tipo: "texto", texto: bloco.texto.trim() };
  const base = { url: bloco.url.trim(), legenda: bloco.legenda.trim() };
  if (bloco.tipo === "video") return { tipo: "video", ...base };
  const alt = bloco.alt?.trim();
  return { tipo: "imagem", ...base, ...(alt ? { alt } : {}) };
}

/** Converte uma única vez para o corpo de `POST`/`PATCH /admin/conteudos`. */
export function paraBackendConteudo(input: Partial<ConteudoAdminInput>): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};
  if (input.titulo !== undefined) corpo.titulo = input.titulo.trim();
  if (input.categoria !== undefined) corpo.categoria = input.categoria;
  if (input.blocos !== undefined) {
    corpo.conteudo = {
      itens: input.blocos.map((b) => (ehBlocoEditavel(b) ? limparBloco(b) : b)),
    };
  }
  if (input.classificacaoIds !== undefined) corpo.classificacao_ids = input.classificacaoIds;
  if (input.destinos !== undefined) corpo.destinos = input.destinos;
  if (input.publicado !== undefined) corpo.status = input.publicado ? "publicado" : "rascunho";
  if (input.ordem !== undefined) corpo.ordem = input.ordem;
  return corpo;
}
