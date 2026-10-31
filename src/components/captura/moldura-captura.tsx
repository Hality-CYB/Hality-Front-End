import type { RefObject } from "react";
import { SwitchCamera } from "lucide-react";
import { GuiaCaptura } from "@/components/captura/guia-captura";
import type { EstadoCamera } from "@/hooks/use-camera";
import { cn } from "@/lib/utils";

export type FotoPrevia = { previewUrl: string; origem: "camera" | "galeria" };

type MolduraCapturaProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  estadoCamera: EstadoCamera;
  foto: FotoPrevia | null;
  contagem: number | null;
  flash: number;
  dica: string | null;
  podeAlternarCamera: boolean;
  onAlternarCamera: () => void;
};

export function MolduraCaptura({
  videoRef,
  estadoCamera,
  foto,
  contagem,
  flash,
  dica,
  podeAlternarCamera,
  onAlternarCamera,
}: MolduraCapturaProps) {
  const aoVivo = foto === null;
  const cameraAtiva = aoVivo && estadoCamera === "ativa";
  const cameraSemImagem =
    estadoCamera === "negada" || estadoCamera === "indisponivel" || estadoCamera === "erro";

  return (
    <div
      data-testid="moldura-captura"
      className="shell:h-auto shell:aspect-[4/3] relative h-[calc(100dvh_-_340px)] min-h-80 overflow-hidden rounded-[20px] bg-teal-900"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        data-testid="camera-video"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity",
          cameraAtiva ? "opacity-100" : "opacity-0",
        )}
      />

      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto.previewUrl}
          alt="Foto da língua"
          className={cn(
            "absolute inset-0 h-full w-full",
            foto.origem === "camera" ? "object-cover" : "object-contain",
          )}
        />
      )}

      {aoVivo && !cameraSemImagem && <GuiaCaptura />}
      {foto?.origem === "camera" && <GuiaCaptura mascara={false} />}

      {aoVivo && cameraSemImagem && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <p className="max-w-80 text-center text-sm text-white/80">
            {estadoCamera === "negada"
              ? "A câmera está bloqueada. Libere o acesso nas configurações do navegador ou envie uma foto da galeria."
              : estadoCamera === "erro"
                ? "Não foi possível usar a câmera. Tire a foto pelo botão de captura ou escolha uma da galeria."
                : "Não encontramos uma câmera disponível. Tire a foto pelo botão de captura ou escolha uma da galeria."}
          </p>
        </div>
      )}

      {cameraAtiva && (
        <span className="font-heading absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden />
          Pronto
        </span>
      )}

      {cameraAtiva && podeAlternarCamera && contagem === null && (
        <button
          type="button"
          onClick={onAlternarCamera}
          aria-label="Alternar entre câmera frontal e traseira"
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-950/50 text-white backdrop-blur-sm"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      )}

      {contagem !== null && (
        <span
          key={contagem}
          data-testid="contagem-captura"
          className="contagem-captura font-heading absolute inset-0 flex items-center justify-center text-8xl font-bold text-white drop-shadow-lg"
        >
          {contagem}
        </span>
      )}

      {flash > 0 && (
        <div
          key={flash}
          aria-hidden
          className="flash-captura absolute inset-0 hidden bg-white motion-safe:block"
        />
      )}

      <p
        aria-live="polite"
        className={cn(
          dica
            ? "absolute inset-x-3 bottom-3 mx-auto w-fit max-w-[calc(100%_-_24px)] rounded-full bg-teal-950/70 px-4 py-2 text-center text-[13px] text-white backdrop-blur-sm"
            : "sr-only",
        )}
      >
        {dica}
      </p>
    </div>
  );
}
