"use client";

import Link from "next/link";
import { Shield, Users, Beaker, CircleCheck, Lightbulb, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelChip } from "@/components/level-chip";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useUsuarios } from "@/hooks/use-usuarios";
import { useDiagnosticos } from "@/hooks/use-diagnosticos";
import { useDicas } from "@/hooks/use-dicas";

const NOME_PLACEHOLDER = "Marcelo";

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
    href: "/admin/validacao",
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
    href: "/admin/usuarios/novo",
  },
];

export default function AdminHomePage() {
  const { data: usuarios } = useUsuarios();
  const { data: diagnosticos } = useDiagnosticos();
  const { data: dicas } = useDicas();

  const stats = [
    { valor: usuarios?.length ?? 0, label: "usuários", Icon: Users },
    { valor: diagnosticos?.length ?? 0, label: "diagnósticos", Icon: Beaker },
    {
      valor: diagnosticos?.filter((d) => d.status === "concluido").length ?? 0,
      label: "revisados",
      Icon: CircleCheck,
    },
    {
      valor: dicas?.filter((d) => d.publicado).length ?? 0,
      label: "dicas ativas",
      Icon: Lightbulb,
    },
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
        <h1 className="mb-5 text-[22px] text-white">Olá, {NOME_PLACEHOLDER}</h1>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map(({ valor, label, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-2xl border border-white/14 bg-white/12 p-3.5"
            >
              <Icon className="h-4.5 w-4.5 text-white/80" />
              <div>
                <div className="font-heading text-xl leading-none font-black text-white">
                  {valor}
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
            <h2 className="text-lg">Últimos usuários</h2>
            <Link
              href="/admin/usuarios"
              className="font-heading text-primary text-[13px] font-bold"
            >
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col">
            {usuarios?.slice(0, 3).map((u, i) => (
              <Link
                key={u.id}
                href={`/admin/usuarios/${u.id}`}
                className={`flex items-center gap-3 py-3 ${i < 2 ? "border-border border-b" : ""}`}
              >
                <AvatarWithRole
                  nome={u.nome}
                  size={36}
                  role={u.role === "paciente" ? undefined : u.role}
                />
                <div className="flex-1">
                  <div className="font-heading text-[13px] font-bold">{u.nome}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {new Date(u.criadoEm).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Badge>{u.role}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Diagnósticos recentes</h2>
            <Link
              href="/admin/validacao"
              className="font-heading text-primary text-[13px] font-bold"
            >
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col">
            {diagnosticos?.slice(0, 3).map((d, i) => (
              <Link
                key={d.id}
                href={`/admin/validacao/${d.id}`}
                className={`flex items-center gap-3 py-3 ${i < 2 ? "border-border border-b" : ""}`}
              >
                <div className="bg-background flex h-9 w-9 items-center justify-center rounded-[10px]">
                  <Beaker className="text-primary h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <div className="font-heading text-[13px] font-bold">
                    Paciente {d.pacienteId.slice(-1)}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <LevelChip nivel={d.nivel} size="sm" />
                <Badge>{d.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
