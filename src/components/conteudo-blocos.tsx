import { Image as ImageIcon, Video } from "lucide-react";
import { urlDaApi } from "@/lib/url-da-api";
import { ehBlocoEditavel, textosDoConteudo, type BlocoConteudo } from "@/types/conteudo";

type ConteudoBlocosProps = {
  blocos: BlocoConteudo[];
};

function MidiaAusente({ tipo }: { tipo: "imagem" | "video" }) {
  const Icon = tipo === "video" ? Video : ImageIcon;
  return (
    <div className="bg-background border-border text-gray-3 flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border">
      <Icon className="h-5.5 w-5.5" aria-hidden />
      <span className="font-heading text-[11px]">
        {tipo === "video" ? "Vídeo indisponível" : "Imagem indisponível"}
      </span>
    </div>
  );
}

/**
 * Renderiza os blocos de um conteúdo na ordem salva. É o mesmo componente na
 * home, nas orientações do diagnóstico e nos previews do admin, para o preview
 * mostrar exatamente o que o paciente vê.
 */
export function ConteudoBlocos({ blocos }: ConteudoBlocosProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {blocos.map((bloco, i) => {
        if (!ehBlocoEditavel(bloco)) {
          // Tipo que o front não conhece (ex.: protocolo_tratamento): mostra o texto que houver.
          const [texto] = textosDoConteudo({ itens: [bloco] });
          return texto ? (
            <p key={i} className="text-muted-foreground text-[13px] leading-relaxed">
              {texto}
            </p>
          ) : null;
        }
        if (bloco.tipo === "texto") {
          return (
            <p
              key={i}
              className="text-muted-foreground text-[13px] leading-relaxed whitespace-pre-line"
            >
              {bloco.texto}
            </p>
          );
        }
        const url = bloco.url.trim() ? urlDaApi(bloco.url.trim()) : "";
        return (
          <figure key={i} className="m-0 flex flex-col gap-1.5">
            {!url ? (
              <MidiaAusente tipo={bloco.tipo} />
            ) : bloco.tipo === "imagem" ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL cadastrada pelo admin, de qualquer domínio
              <img
                src={url}
                alt={bloco.alt ?? ""}
                className="border-border block max-h-[60vh] w-full rounded-xl border object-contain"
              />
            ) : (
              <video
                src={url}
                controls
                className="border-border block max-h-[60vh] w-full rounded-xl border bg-black"
              />
            )}
            {bloco.legenda && (
              <figcaption className="text-muted-foreground text-xs">{bloco.legenda}</figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
