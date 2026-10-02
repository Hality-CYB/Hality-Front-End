"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuario } from "@/hooks/use-usuarios";
import { usePacientes } from "@/hooks/use-pacientes";

export default function ProfissionalPacientesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profissional } = useUsuario(id);
  const { data: pacientes } = usePacientes({ profissionalId: id });

  if (!profissional) return null;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-6" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href={`/admin/usuarios/${id}`}
          className="font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {profissional.nome}
        </Link>
        <div className="flex items-center gap-3">
          <AvatarWithRole nome={profissional.nome} size={44} role="profissional" />
          <div>
            <div className="font-heading text-base font-extrabold text-white">Pacientes</div>
            <div className="text-xs text-white/60">{pacientes?.length ?? 0} pacientes</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {pacientes?.length === 0 && (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Nenhum paciente"
            description={`${profissional.nome} ainda não tem pacientes vinculados.`}
          />
        )}
        <div className="cyb-grid gap-2.5">
          {pacientes?.map((p) => (
            <Link
              key={p.id}
              href={`/admin/usuarios/${p.id}?voltar=/admin/usuarios/${id}/pacientes`}
            >
              <Card className="patient-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <AvatarWithRole nome={p.nome} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{p.nome}</div>
                  <div className="text-muted-foreground mb-1.5 truncate text-xs">{p.email}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {!p.consentimentoDadosSaude.aceito && (
                      <StatusBadge label="Cadastro pendente" status="pending" />
                    )}
                    {p.ultimoNivel !== null && <LevelChip nivel={p.ultimoNivel} size="sm" />}
                  </div>
                </div>
                <ChevronRight className="text-gray-3 h-4 w-4" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
