"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Beaker } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { DiagnosticoAdminCard } from "@/components/diagnostico-admin-card";
import { useUsuario } from "@/hooks/use-usuarios";
import { useDiagnosticosAdminPaginados } from "@/hooks/use-diagnosticos";

export default function UsuarioDiagnosticosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? `/admin/usuarios/${id}`;

  const { data: paciente } = useUsuario(id);
  const lista = useDiagnosticosAdminPaginados({ pacienteId: id, limite: 20 });
  const diagnosticos = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const total = lista.data?.pages[0]?.total ?? 0;

  if (!paciente) return null;

  const hrefAtual = `/admin/usuarios/${id}/diagnosticos?voltar=${encodeURIComponent(voltarHref)}`;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {paciente.nome}
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={paciente.nome} size={44} />
          <div>
            <div className="font-heading text-base font-extrabold text-white">Diagnósticos</div>
            <div className="text-xs text-white/60">
              {total} exame{total === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {lista.isSuccess && diagnosticos.length === 0 && (
          <EmptyState
            icon={<Beaker className="h-7 w-7" />}
            title="Nenhum diagnóstico"
            description={`${paciente.nome} ainda não fez nenhum diagnóstico.`}
          />
        )}
        <div className="cyb-grid diag-list-card gap-2.5">
          {diagnosticos.map((d) => (
            <DiagnosticoAdminCard
              key={d.id}
              diagnostico={d}
              titulo={`Diagnóstico #${d.id}`}
              href={`/admin/diagnosticos/${d.id}?voltar=${encodeURIComponent(hrefAtual)}`}
            />
          ))}
        </div>
        <ScrollInfinito
          temMais={!!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
    </div>
  );
}
