import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DicaForm } from "@/components/dica-form";

export default function NovaDicaPage() {
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
        <DicaForm />
      </div>
    </div>
  );
}
