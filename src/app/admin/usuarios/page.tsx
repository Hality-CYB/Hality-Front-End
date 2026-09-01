"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuarios } from "@/hooks/use-usuarios";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/usuario";

const FILTROS: { valor: Role | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "paciente", label: "Pacientes" },
  { valor: "profissional", label: "Profissionais" },
  { valor: "admin", label: "Admins" },
];

export default function UsuariosPage() {
  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState<Role | "todos">("todos");
  const { data: usuarios } = useUsuarios();

  const filtrados = (usuarios ?? [])
    .filter((u) => filtroRole === "todos" || u.role === filtroRole)
    .filter((u) => u.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Usuários</h1>
        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuário..."
            className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pr-3.5 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroRole(f.valor)}
              className={cn(
                "font-heading shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                filtroRole === f.valor
                  ? "bg-white text-[var(--primary)]"
                  : "bg-white/15 text-white/85",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <Button asChild>
          <Link href="/admin/usuarios/novo">
            <Plus className="h-4 w-4" /> Criar usuário
          </Link>
        </Button>

        <div className="user-list-card shell:cyb-grid flex flex-col gap-2.5">
          {filtrados.length === 0 && (
            <EmptyState icon={<Users className="h-7 w-7" />} title="Nenhum usuário encontrado" />
          )}
          {filtrados.map((u) => (
            <Link key={u.id} href={`/admin/usuarios/${u.id}`}>
              <Card className="user-list-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <AvatarWithRole
                  nome={u.nome}
                  size={48}
                  role={u.role === "paciente" ? undefined : u.role}
                />
                <div className="user-list-card-body min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{u.nome}</div>
                  <div className="text-muted-foreground mb-1.5 truncate text-xs">{u.email}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{u.role}</Badge>
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
