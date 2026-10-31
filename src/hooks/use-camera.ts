"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoCamera = "iniciando" | "ativa" | "negada" | "indisponivel" | "erro";

export type LadoCamera = "environment" | "user";

export type CapturaCamera = {
  file: File;
  largura: number;
  altura: number;
  facingMode?: string;
};

function estadoDoErro(erro: unknown): EstadoCamera {
  // getUserMedia rejeita com DOMException, que nem sempre é `instanceof Error`.
  const nome = typeof erro === "object" && erro !== null && "name" in erro ? String(erro.name) : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") return "negada";
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return "indisponivel";
  return "erro";
}

/** Câmera ao vivo (traseira no celular, alternável) enquanto `ativa`; desliga ao sair.
 * Fora de HTTPS/localhost fica "indisponivel" e quem usa oferece outro caminho. */
export function useCamera(ativa: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<EstadoCamera>("iniciando");
  const [facingMode, setFacingMode] = useState<string | undefined>();
  const [lado, setLado] = useState<LadoCamera>("environment");
  const [podeAlternar, setPodeAlternar] = useState(false);

  useEffect(() => {
    if (!ativa) return;
    let cancelado = false;

    function parar() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function iniciar() {
      setEstado("iniciando");
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setEstado("indisponivel");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: lado },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        // Strict Mode / troca de passo antes do getUserMedia resolver.
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setFacingMode(stream.getVideoTracks()[0]?.getSettings().facingMode);
        const dispositivos = await navigator.mediaDevices.enumerateDevices?.();
        if (!cancelado && dispositivos) {
          setPodeAlternar(dispositivos.filter((d) => d.kind === "videoinput").length > 1);
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) setEstado("ativa");
          else video.onloadedmetadata = () => !cancelado && setEstado("ativa");
        } else {
          setEstado("ativa");
        }
      } catch (erro) {
        if (!cancelado) setEstado(estadoDoErro(erro));
      }
    }

    void iniciar();
    return () => {
      cancelado = true;
      parar();
    };
  }, [ativa, lado]);

  const alternarCamera = useCallback(
    () => setLado((atual) => (atual === "environment" ? "user" : "environment")),
    [],
  );

  const capturar = useCallback(async (): Promise<CapturaCamera> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) throw new Error("A câmera ainda não está pronta.");
    const largura = video.videoWidth;
    const altura = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível capturar a imagem.");
    ctx.drawImage(video, 0, 0, largura, altura);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) throw new Error("Não foi possível capturar a imagem.");
    const file = new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" });
    return { file, largura, altura, facingMode };
  }, [facingMode]);

  return { videoRef, estado, capturar, podeAlternar, alternarCamera };
}
