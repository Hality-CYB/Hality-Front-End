"use client";

import { Lightbulb } from "lucide-react";
import { useDicas } from "@/hooks/use-dicas";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";

export default function DicasPage() {
  const { data: dicas, isLoading } = useDicas({ publicado: true });

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1>Dicas para você</h1>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}

      {!isLoading && dicas?.length === 0 && (
        <EmptyState
          icon={<Lightbulb className="h-7 w-7" />}
          title="Nenhuma dica disponível"
          description="Volte mais tarde para novas orientações."
        />
      )}

      {dicas?.map((dica) => (
        <TipCard
          key={dica.id}
          titulo={dica.titulo}
          categoria={dica.categoria}
          corpo={dica.corpo}
          formato={dica.formato}
          midiaUrl={dica.midiaUrl}
        />
      ))}
    </div>
  );
}
