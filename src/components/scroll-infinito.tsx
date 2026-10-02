"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScrollInfinitoProps = {
  temMais: boolean;
  carregando: boolean;
  erro?: boolean;
  onCarregarMais: () => void;
  className?: string;
};

/**
 * Fim de uma lista paginada: pede a próxima página quando chega perto da tela
 * (desktop e mobile). O observer é recriado a cada carga, então, se a página
 * nova ainda não enche a tela, ele dispara de novo sozinho.
 */
export function ScrollInfinito({
  temMais,
  carregando,
  erro = false,
  onCarregarMais,
  className,
}: ScrollInfinitoProps) {
  const sentinela = useRef<HTMLDivElement>(null);
  const carregarMais = useRef(onCarregarMais);

  useEffect(() => {
    carregarMais.current = onCarregarMais;
  });

  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || !temMais || carregando || erro) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) carregarMais.current();
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(alvo);
    return () => observer.disconnect();
  }, [temMais, carregando, erro]);

  if (!temMais) return null;

  return (
    <div ref={sentinela} className={className}>
      <div className="flex min-h-12 items-center justify-center">
        {erro ? (
          <Button variant="secondary" onClick={onCarregarMais}>
            Tentar carregar mais
          </Button>
        ) : (
          carregando && (
            <span className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
              Carregando mais…
            </span>
          )
        )}
      </div>
    </div>
  );
}
