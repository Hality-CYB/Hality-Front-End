import { z } from "zod";

/**
 * Shape do campo `conteudo` (JSONB) da tabela genérica `conteudos` do back
 * (app/models/conteudo.py) — usado tanto no `conteudos` de um diagnóstico
 * (GET /diagnosticos/{id}) quanto nas `dicas` da home (GET /home). Cada
 * bloco tem um `tipo` (ex.: "texto", "protocolo_tratamento") com campos
 * extras que variam por tipo. O back aceita qualquer `tipo`; os que o editor
 * do admin monta estão em `BlocoEditavel`.
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

/**
 * Formatos que o editor do admin monta: um conteúdo é um bloco só, com texto,
 * ou imagem/vídeo com descrição (`legenda`). `alt` é opcional e só é lido se
 * vier do back.
 */
export type BlocoEditavel =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem"; url: string; legenda: string; alt?: string }
  | { tipo: "video"; url: string; legenda: string };
export type FormatoConteudo = BlocoEditavel["tipo"];

export function ehBlocoEditavel(bloco: BlocoConteudo): bloco is BlocoConteudo & BlocoEditavel {
  const texto = (v: unknown) => typeof v === "string";
  const opcional = (v: unknown) => v === undefined || texto(v);
  const campos = Object.keys(bloco);
  const so = (...permitidos: string[]) => campos.every((c) => permitidos.includes(c));
  if (bloco.tipo === "texto") return texto(bloco.texto) && so("tipo", "texto");
  if (bloco.tipo === "imagem") {
    return texto(bloco.url) && opcional(bloco.legenda) && opcional(bloco.alt)
      ? so("tipo", "url", "legenda", "alt")
      : false;
  }
  if (bloco.tipo === "video") {
    return texto(bloco.url) && opcional(bloco.legenda) && so("tipo", "url", "legenda");
  }
  return false;
}

/** O conteúdo que o editor sabe editar: exatamente um bloco de formato conhecido. */
export function blocoUnicoEditavel(blocos: BlocoConteudo[]): BlocoEditavel | null {
  const [bloco] = blocos;
  return blocos.length === 1 && bloco && ehBlocoEditavel(bloco) ? bloco : null;
}

/** Onde o conteúdo publicado aparece (`DestinoConteudo` do back, #161). */
export const DESTINOS_CONTEUDO = {
  home_autenticada: {
    label: "Home do paciente",
    descricao: "Seção “Dicas para você” da home.",
  },
  orientacoes_diagnostico: {
    label: "Orientações do diagnóstico",
    descricao: "Aba de orientações do resultado, nos níveis escolhidos.",
  },
  captura: { label: "Captura da foto", descricao: "" },
  landing_publica: { label: "Página pública", descricao: "" },
} as const;
export type DestinoConteudo = keyof typeof DESTINOS_CONTEUDO;
export const destinoConteudoSchema = z.enum(
  Object.keys(DESTINOS_CONTEUDO) as [DestinoConteudo, ...DestinoConteudo[]],
);

/**
 * Os destinos que o admin escolhe. Captura e página pública existem no back,
 * mas o produto não vai publicar conteúdo nelas (decisão do time); se um
 * conteúdo vier com eles, o formulário mantém como está.
 */
export const DESTINOS_EDITAVEIS = ["home_autenticada", "orientacoes_diagnostico"] as const;

function urlValida(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * O que impede salvar o bloco e os destinos, na linguagem de quem edita. A
 * regra dos níveis é a mesma do back (`_validar_destinos_classificacoes`).
 */
export function problemasDoConteudo(c: {
  bloco: BlocoEditavel | null;
  destinos: DestinoConteudo[];
  classificacaoIds: number[];
}): string[] {
  const problemas: string[] = [];
  const { bloco } = c;
  if (bloco?.tipo === "texto" && !bloco.texto.trim()) problemas.push("Escreva o texto.");
  if (bloco && bloco.tipo !== "texto") {
    const midia = bloco.tipo === "imagem" ? "da imagem" : "do vídeo";
    if (!bloco.url.trim()) problemas.push(`Envie o arquivo ${midia}.`);
    else if (!urlValida(bloco.url.trim())) {
      problemas.push(`Envie o arquivo ${midia} de novo.`);
    }
    if (!bloco.legenda.trim()) problemas.push(`Escreva a descrição ${midia}.`);
  }
  if (c.destinos.includes("orientacoes_diagnostico") && c.classificacaoIds.length === 0) {
    problemas.push("Escolha pelo menos um nível para as orientações do diagnóstico.");
  }
  return problemas;
}

/**
 * O que o card mostra de um conteúdo: a primeira imagem ou vídeo (se houver)
 * e todo o texto junto (texto dos blocos e descrição das mídias). O conteúdo
 * inteiro aparece no modal, em `ConteudoBlocos`.
 */
export function resumoDoConteudo(blocos: BlocoConteudo[]): {
  midia: { tipo: "imagem" | "video"; url: string; alt?: string } | null;
  texto: string;
} {
  let midia: { tipo: "imagem" | "video"; url: string; alt?: string } | null = null;
  const textos: string[] = [];
  for (const bloco of blocos) {
    if (!ehBlocoEditavel(bloco)) {
      textos.push(...textosDoConteudo({ itens: [bloco] }));
    } else if (bloco.tipo === "texto") {
      textos.push(bloco.texto);
    } else {
      if (!midia && bloco.url.trim()) {
        midia = {
          tipo: bloco.tipo,
          url: bloco.url.trim(),
          ...(bloco.tipo === "imagem" && bloco.alt ? { alt: bloco.alt } : {}),
        };
      }
      textos.push(bloco.legenda ?? "");
    }
  }
  return { midia, texto: textos.filter((t) => t.trim()).join("\n\n") };
}

/**
 * Upload de mídia (`POST /admin/conteudos/midias`): mesmos formatos e limites
 * do back (`conteudo_storage`), checados antes de enviar para o admin não
 * esperar o upload inteiro de um arquivo que vai ser recusado.
 */
export const MIDIA_ACEITA = {
  imagem: {
    tipos: ["image/jpeg", "image/png", "image/webp"],
    maxMb: 10,
    nome: "JPEG, PNG ou WEBP",
  },
  video: { tipos: ["video/mp4", "video/webm"], maxMb: 50, nome: "MP4 ou WEBM" },
} as const;

export const backendMidiaEnviadaSchema = z.object({
  url: z.string(),
  tipo: z.enum(["imagem", "video"]),
});
export type MidiaEnviada = z.infer<typeof backendMidiaEnviadaSchema>;

/** O que impede enviar o arquivo como mídia do formato escolhido. */
export function problemaDoArquivo(arquivo: File, formato: "imagem" | "video"): string | null {
  const regra = MIDIA_ACEITA[formato];
  if (!(regra.tipos as readonly string[]).includes(arquivo.type)) {
    return `Formato não aceito. Envie ${formato === "imagem" ? "uma imagem" : "um vídeo"} ${regra.nome}.`;
  }
  if (arquivo.size > regra.maxMb * 1024 * 1024) {
    return `Arquivo maior que ${regra.maxMb} MB. Envie um arquivo menor.`;
  }
  return null;
}
