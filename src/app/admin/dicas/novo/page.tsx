"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DicaForm } from "@/components/dica-form";
import { useCriarDica } from "@/hooks/use-dicas";
import type { DicaInput } from "@/types/dica";

export default function NovaDicaPage() {
  const router = useRouter();
  const criar = useCriarDica();

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/dicas"
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Conteúdos
        </Link>
        <h1 className="text-xl text-white">Nova dica</h1>
      </div>
      <div className="p-4">
        <DicaForm
          salvando={criar.isPending}
          erro={criar.isError ? "Não foi possível salvar a dica. Tente novamente." : null}
          // Na criação o formulário sempre manda todos os campos.
          onSalvar={(input) =>
            criar.mutate(input as DicaInput, { onSuccess: () => router.push("/admin/dicas") })
          }
        />
      </div>
    </div>
  );
}
