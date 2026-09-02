"use client";

import { use } from "react";
import { DicaForm } from "@/components/dica-form";
import { useDica } from "@/hooks/use-dicas";

export default function EditarDicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: dica } = useDica(id);

  if (!dica) return null;

  return (
    <div className="flex flex-col p-4">
      <h1 className="mb-4 text-xl">Editar dica</h1>
      <DicaForm dica={dica} />
    </div>
  );
}
