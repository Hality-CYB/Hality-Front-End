"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Camera, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { usePacientesPaginados } from "@/hooks/use-pacientes";

export default function PacientesPage() {
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const lista = usePacientesPaginados({ busca: buscaAdiada, limite: 20 });
  const pacientes = lista.data?.pages.flatMap((p) => p.itens) ?? [];

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Pacientes</h1>
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pr-3.5 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <Button asChild>
          <Link href="/profissional/avaliacao">
            <Camera className="h-4 w-4" /> Avaliar paciente
          </Link>
        </Button>

        {!lista.isLoading && pacientes.length === 0 && (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={busca ? "Nenhum paciente encontrado" : "Nenhum paciente ainda"}
            description={
              busca
                ? "Tente buscar por outro nome ou e-mail."
                : "Cadastre um paciente em Avaliar paciente."
            }
          />
        )}

        <div className="cyb-grid gap-2.5">
          {pacientes.map((p) => (
            <Link key={p.id} href={`/profissional/pacientes/${p.id}`}>
              <Card className="patient-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <AvatarWithRole nome={p.nome} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{p.nome}</div>
                  <div className="text-muted-foreground mb-0.5 truncate text-xs">{p.email}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {p.totalDiagnosticos} diagnósticos
                    {p.ultimoDiagnosticoEm &&
                      ` · último ${new Date(p.ultimoDiagnosticoEm).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!p.ativo && <StatusBadge label="Inativo" status="neutral" />}
                  {p.ultimoNivel !== null && <LevelChip nivel={p.ultimoNivel} size="sm" />}
                  <ChevronRight className="text-gray-3 h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {lista.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={() => lista.fetchNextPage()}
              disabled={lista.isFetchingNextPage}
            >
              {lista.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
