"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuario } from "@/hooks/use-usuarios";
import { useVinculosPaginados } from "@/hooks/use-vinculos";

/** Pacientes com vínculo ativo com o profissional (`/admin/vinculos?profissional_id=`). */
export default function ProfissionalPacientesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? `/admin/usuarios/${id}`;
  const { data: profissional } = useUsuario(id);
  const lista = useVinculosPaginados({ profissionalId: id, ativo: true, limite: 20 });
  const vinculos = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const total = lista.data?.pages[0]?.total ?? 0;

  if (!profissional) return null;

  const hrefAtual = `/admin/usuarios/${id}/pacientes?voltar=${encodeURIComponent(voltarHref)}`;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={voltarHref}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {profissional.nome}
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={profissional.nome} size={44} role="profissional" />
          <div>
            <div className="font-heading text-base font-extrabold text-white">Pacientes</div>
            <div className="text-xs text-white/60">
              {total} paciente{total === 1 ? "" : "s"} vinculado{total === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {lista.isSuccess && vinculos.length === 0 && (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Nenhum paciente"
            description={`${profissional.nome} ainda não tem pacientes vinculados.`}
          />
        )}
        <div className="cyb-grid gap-2.5">
          {vinculos.map((v) => (
            <Link
              key={v.id}
              href={`/admin/usuarios/${v.pacienteId}?voltar=${encodeURIComponent(hrefAtual)}`}
            >
              <Card className="patient-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <AvatarWithRole nome={v.pacienteNome} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{v.pacienteNome}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    Vinculado em {new Date(v.vinculadoEm).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <ChevronRight className="text-gray-3 h-4 w-4" />
              </Card>
            </Link>
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
