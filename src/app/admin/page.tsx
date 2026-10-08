"use client";

import Link from "next/link";
import { Shield, Users, Beaker, CircleCheck, Lightbulb, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { DiagnosticoAdminCard } from "@/components/diagnostico-admin-card";
import { useUsuarios } from "@/hooks/use-usuarios";
import { useDiagnosticosAdmin } from "@/hooks/use-diagnosticos";
import { useDicas } from "@/hooks/use-dicas";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { roleLabel, roleBadgeStatus } from "@/lib/role-format";
import type { Role } from "@/types/usuario";

const PAPEIS: Role[] = ["paciente", "profissional", "admin"];

const ACOES_RAPIDAS = [
  {
    label: "Ver usuários",
    Icon: Users,
    bg: "bg-secondary",
    color: "text-primary",
    href: "/admin/usuarios",
  },
  {
    label: "Ver diagnósticos",
    Icon: Beaker,
    bg: "bg-[#EDE9FE]",
    color: "text-[#7C3AED]",
    href: "/admin/diagnosticos",
  },
  {
    label: "Criar dica",
    Icon: Lightbulb,
    bg: "bg-[#FEF3C7]",
    color: "text-[#D97706]",
    href: "/admin/dicas/novo",
  },
  {
    label: "Criar usuário",
    Icon: Plus,
    bg: "bg-[#D1FAE5]",
    color: "text-[#16A34A]",
    href: "/admin/usuarios?criar=1",
  },
];

export default function AdminHomePage() {
  const { nome } = useSessaoAtual();
  // Os números vêm do `total` das listas paginadas (`limite: 1`): o back não tem rota de resumo do admin.
  const totalUsuarios = useUsuarios({ limite: 1 }).data?.total;
  const porPapel = {
    paciente: useUsuarios({ role: "paciente", limite: 1 }).data?.total,
    profissional: useUsuarios({ role: "profissional", limite: 1 }).data?.total,
    admin: useUsuarios({ role: "admin", limite: 1 }).data?.total,
  };
  const totalDiagnosticos = useDiagnosticosAdmin({ limite: 1 }).data?.total;
  const totalRevisados = useDiagnosticosAdmin({ status: "concluido", limite: 1 }).data?.total;
  const recentes = useDiagnosticosAdmin({ limite: 3 }).data?.itens ?? [];
  const { data: dicas } = useDicas();

  const stats = [
    { valor: totalUsuarios, label: "usuários", Icon: Users },
    { valor: totalDiagnosticos, label: "diagnósticos", Icon: Beaker },
    { valor: totalRevisados, label: "revisados", Icon: CircleCheck },
    { valor: dicas?.filter((d) => d.publicado).length, label: "dicas publicadas", Icon: Lightbulb },
  ];

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden p-5 pb-7"
        style={{ background: "linear-gradient(160deg, #0a3d4a 0%, #0b6b82 55%, #0d8aa6 100%)" }}
      >
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-white/50" />
          <span className="text-xs text-white/50">Painel administrativo</span>
        </div>
        <h1 className="mb-5 text-[22px] text-white">Olá, {nome.split(" ")[0]}</h1>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map(({ valor, label, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-2xl border border-white/14 bg-white/12 p-3.5"
            >
              <Icon className="h-4.5 w-4.5 text-white/80" />
              <div>
                <div className="font-heading text-xl leading-none font-black text-white">
                  {valor ?? "—"}
                </div>
                <div className="mt-0.5 text-[10px] text-white/50">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {ACOES_RAPIDAS.map(({ label, Icon, bg, color, href }) => (
            <Link
              key={label}
              href={href}
              className="border-border flex flex-col gap-2.5 rounded-2xl border bg-white p-4"
            >
              <div className={`flex h-9.5 w-9.5 items-center justify-center rounded-[11px] ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="font-heading text-[13px] font-bold">{label}</span>
            </Link>
          ))}
        </div>

        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Usuários por papel</h2>
            <Link
              href="/admin/usuarios"
              className="font-heading text-primary text-[13px] font-bold"
            >
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col">
            {PAPEIS.map((papel, i) => (
              <Link
                key={papel}
                href={`/admin/usuarios?role=${papel}`}
                className={`flex items-center justify-between py-3 ${
                  i < PAPEIS.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <StatusBadge label={roleLabel(papel)} status={roleBadgeStatus(papel)} />
                <span className="font-heading text-sm font-bold">{porPapel[papel] ?? "—"}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Diagnósticos recentes</h2>
            <Link
              href="/admin/diagnosticos"
              className="font-heading text-primary text-[13px] font-bold"
            >
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {recentes.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum diagnóstico ainda.</p>
            )}
            {recentes.map((d) => (
              <DiagnosticoAdminCard
                key={d.id}
                diagnostico={d}
                titulo={`Diagnóstico #${d.id}`}
                href={`/admin/diagnosticos/${d.id}?voltar=/admin`}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
