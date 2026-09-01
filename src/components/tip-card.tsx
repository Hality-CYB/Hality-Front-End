import { Lightbulb, Image as ImageIcon, Video, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Shell de apresentação — quando types/dica.ts existir (fase 1), o ideal é
 * trocar essas props soltas por `{ dica: Dica; compact?: boolean }`.
 *
 * "compact" reconcilia a divergência que existia em Design/ (3 versões
 * ligeiramente diferentes do TipCard): adotamos o padding condicional do
 * AdminApp como o comportamento único.
 */
type TipCardProps = {
  titulo: string;
  categoria: string;
  corpo: string;
  formato: "texto" | "imagem" | "video";
  midiaUrl?: string;
  icon?: LucideIcon;
  compact?: boolean;
};

export function TipCard({
  titulo,
  categoria,
  corpo,
  formato,
  midiaUrl,
  icon: Icon = Lightbulb,
  compact,
}: TipCardProps) {
  return (
    <Card
      className={cn(
        "flex items-start gap-3.5 rounded-lg shadow-sm ring-0",
        compact ? "p-4" : "p-5",
      )}
    >
      <div
        className={cn(
          "text-primary bg-secondary flex shrink-0 items-center justify-center",
          compact ? "size-[42px] rounded-[12px]" : "size-11 rounded-[13px]",
        )}
      >
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-heading text-sm font-bold">{titulo}</span>
          <span className="font-heading text-primary bg-secondary rounded-4xl px-2 py-0.5 text-[10px] font-semibold">
            {categoria}
          </span>
        </div>
        <p className="text-muted-foreground text-[13px] leading-relaxed">{corpo}</p>
        {formato !== "texto" &&
          (midiaUrl ? (
            <div className="border-border mt-2.5 overflow-hidden rounded-xl border">
              {formato === "imagem" ? (
                // eslint-disable-next-line @next/next/no-img-element -- dica com mídia externa arbitrária, revisar em fase 2 com next/image
                <img src={midiaUrl} alt={titulo} className="block max-h-55 w-full object-cover" />
              ) : (
                <video src={midiaUrl} controls className="block max-h-55 w-full bg-black" />
              )}
            </div>
          ) : (
            <div className="bg-background border-border text-gray-3 mt-2.5 flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border">
              {formato === "video" ? (
                <Video className="h-5.5 w-5.5" />
              ) : (
                <ImageIcon className="h-5.5 w-5.5" />
              )}
              <span className="font-heading text-[11px]">
                {formato === "video" ? "Vídeo" : "Imagem"}
              </span>
            </div>
          ))}
      </div>
    </Card>
  );
}
