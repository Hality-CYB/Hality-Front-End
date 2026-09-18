"use client";

import type { RefObject } from "react";
import { Crosshair, Laugh, Sun } from "lucide-react";
import { AcoesCaptura } from "@/components/captura/acoes-captura";
import { MolduraCaptura, type FotoPrevia } from "@/components/captura/moldura-captura";
import type { EstadoCamera } from "@/hooks/use-camera";
import { useContagemCaptura } from "@/hooks/use-contagem-captura";

const DICAS = [
  { Icon: Sun, texto: "Boa iluminação" },
  { Icon: Laugh, texto: "Língua para fora" },
  { Icon: Crosshair, texto: "Centralize na marcação" },
];

type CapturaLinguaProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  estadoCamera: EstadoCamera;
  podeAlternarCamera: boolean;
  onAlternarCamera: () => void;
  foto: FotoPrevia | null;
  ocupado?: boolean;
  onCapturar: () => void | Promise<void>;
  onGaleria: () => void;
  onVoltar: () => void;
  onUsarFoto: () => void;
  onTirarOutra: () => void;
};

function dicaDaCaptura(foto: FotoPrevia | null, estadoCamera: EstadoCamera, contando: boolean) {
  if (foto) {
    return foto.origem === "camera"
      ? "Confira se a língua está nítida e inteira dentro da marcação"
      : "Confira se a língua aparece nítida e inteira na foto";
  }
  if (contando) return "Segure firme…";
  if (estadoCamera === "ativa") return "Coloque a língua para fora e encaixe na marcação";
  if (estadoCamera === "iniciando") return "Abrindo a câmera…";
  return null;
}

export function CapturaLingua({
  videoRef,
  estadoCamera,
  podeAlternarCamera,
  onAlternarCamera,
  foto,
  ocupado = false,
  onCapturar,
  onGaleria,
  onVoltar,
  onUsarFoto,
  onTirarOutra,
}: CapturaLinguaProps) {
  const { contagem, contando, flash, iniciar } = useContagemCaptura(onCapturar);
  const aoVivo = foto === null;

  function capturar() {
    if (estadoCamera === "ativa") iniciar();
    else void onCapturar();
  }

  return (
    <section className="shell:min-h-[calc(100dvh_-_120px)] shell:justify-center shell:mx-auto shell:w-full shell:max-w-[min(1000px,calc((100dvh_-_290px)*4/3))] shell:min-w-[420px] shell:gap-4 flex flex-col gap-3">
      <header className="shell:text-center">
        <h2 className="shell:text-2xl text-lg">
          {aoVivo ? "Posicione sua língua" : "Confira a foto"}
        </h2>
        <ul className="shell:justify-center shell:gap-x-5 text-muted-foreground mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
          {DICAS.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-center gap-1.5">
              <Icon className="text-primary h-3.5 w-3.5" aria-hidden />
              {texto}
            </li>
          ))}
        </ul>
      </header>

      <MolduraCaptura
        videoRef={videoRef}
        estadoCamera={estadoCamera}
        foto={foto}
        contagem={contagem}
        flash={flash}
        dica={dicaDaCaptura(foto, estadoCamera, contando)}
        podeAlternarCamera={podeAlternarCamera}
        onAlternarCamera={onAlternarCamera}
      />

      <AcoesCaptura
        aoVivo={aoVivo}
        contando={contando}
        ocupado={ocupado}
        capturaDesabilitada={contando || ocupado || estadoCamera === "iniciando"}
        onCapturar={capturar}
        onGaleria={onGaleria}
        onVoltar={onVoltar}
        onUsarFoto={onUsarFoto}
        onTirarOutra={onTirarOutra}
      />
    </section>
  );
}
