"use client";

import Link from "next/link";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

/**
 * Estados de página inteira enquanto os dados não chegam: carregando e erro.
 * Substituem o `return null` que deixava a tela em branco sem explicação.
 */
export function CarregandoPagina({ mensagem = "Carregando…" }: { mensagem?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16" role="status">
      <Loader2 className="text-primary h-6 w-6 motion-safe:animate-spin" aria-hidden />
      <span className="text-muted-foreground text-sm">{mensagem}</span>
    </div>
  );
}

type ErroPaginaProps = {
  titulo: string;
  descricao?: string;
  /** Tentar carregar de novo (ex.: `refetch` da query). */
  onTentarDeNovo?: () => void;
  voltar?: { href: string; label: string };
};

export function ErroPagina({ titulo, descricao, onTentarDeNovo, voltar }: ErroPaginaProps) {
  return (
    <div className="p-4" role="alert">
      <EmptyState
        icon={<CircleAlert className="h-7 w-7" aria-hidden />}
        title={titulo}
        description={descricao}
        action={
          (onTentarDeNovo || voltar) && (
            <div className="flex flex-wrap justify-center gap-2.5">
              {onTentarDeNovo && <Button onClick={onTentarDeNovo}>Tentar de novo</Button>}
              {voltar && (
                <Button variant="secondary" asChild>
                  <Link href={voltar.href}>{voltar.label}</Link>
                </Button>
              )}
            </div>
          )
        }
      />
    </div>
  );
}
