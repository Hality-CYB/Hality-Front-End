"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { Maximize2, XIcon } from "lucide-react";

type FotoAmpliavelProps = {
  src: string;
  alt: string;
  onError?: () => void;
};

/**
 * Foto que preenche o espaço do card e, ao clicar, abre grande por cima da
 * tela (fecha com Esc, no X ou clicando fora). Não usa o Dialog do app porque
 * ele abre como gaveta de baixo, e aqui a foto precisa da tela inteira.
 */
export function FotoAmpliavel({ src, alt, onError }: FotoAmpliavelProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        aria-label={`Ampliar: ${alt}`}
        className="group focus-visible:ring-ring absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo back por URL assinada, fora do next/image */}
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={onError} />
        <span
          aria-hidden
          className="absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-white opacity-80 transition-opacity group-hover:opacity-100"
        >
          <Maximize2 className="h-4 w-4" />
        </span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none sm:p-10">
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Foto ampliada. Pressione Esc para fechar.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close asChild>
            {/* Clicar em volta da foto também fecha. */}
            <button type="button" aria-hidden tabIndex={-1} className="absolute inset-0" />
          </DialogPrimitive.Close>
          {/* eslint-disable-next-line @next/next/no-img-element -- mesma URL assinada da miniatura */}
          <img
            src={src}
            alt={alt}
            className="pointer-events-none relative h-full w-full object-contain"
          />
          <DialogPrimitive.Close
            aria-label="Fechar foto"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <XIcon className="h-5 w-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
