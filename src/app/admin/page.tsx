"use client";

import Link from "next/link";
import { Shield, Users, Beaker, CircleCheck, Clock, Lightbulb, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { DiagnosticoAdminCard } from "@/components/diagnostico-admin-card";
import { useUsuarios } from "@/hooks/use-usuarios";
import { useDiagnosticosAdmin } from "@/hooks/use-diagnosticos";
import { useResumoAdmin } from "@/hooks/use-admin";
import { useClassificacoes } from "@/hooks/use-classificacoes";
import { useConteudosAdmin } from "@/hooks/use-conteudos-admin";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { nivelBadgeStatus, nivelLabel } from "@/lib/level-format";
import { roleLabel, roleBadgeStatus } from "@/lib/role-format";
import { contagemPorNivel } from "@/types/admin";
import type { DiagnosticoNivel } from "@/types/diagnostico";
import type { Role } from "@/types/usuario";

const PAPEIS: Role[] = ["paciente", "profissional", "admin"];
const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

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
    label: "Criar conteúdo",
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
  // Usuários e conteúdos: `total` das listas paginadas (`limite: 1`). Diagnósticos: `GET /admin/resumo`.
  const porPapel = {
    paciente: useUsuarios({ role: "paciente", limite: 1 }).data?.total,
    profissional: useUsuarios({ role: "profissional", limite: 1 }).data?.total,
    admin: useUsuarios({ role: "admin", limite: 1 }).data?.total,
  };
  // Só soma quando as três contagens chegaram, para o total não aparecer parcial.
  const totalUsuarios = PAPEIS.reduce<number | undefined>((soma, papel) => {
    const n = porPapel[papel];
    return soma === undefined || n === undefined ? undefined : soma + n;
  }, 0);
  const { data: resumo } = useResumoAdmin();
  const { data: classificacoes } = useClassificacoes();
  const porNivel = resumo && classificacoes ? contagemPorNivel(resumo, classificacoes) : null;
  const recentes = useDiagnosticosAdmin({ limite: 3 }).data?.itens ?? [];
  // A fila de revisão é a inteira: o resumo só conta pendentes criados nos 30 dias.
  const pendentes = useDiagnosticosAdmin({ status: "aguardando_revisao", limite: 1 }).data?.total;
  const conteudosPublicados = useConteudosAdmin({ publicado: true, limite: 1 }).data?.total;

  const stats = [
    { valor: resumo?.totalDiagnosticos, label: "diagnósticos em 30 dias", Icon: Beaker },
    { valor: pendentes, label: "aguardando revisão", Icon: Clock },
    { valor: resumo?.revisados, label: "revisados em 30 dias", Icon: CircleCheck },
    { valor: conteudosPublicados, label: "conteúdos publicados", Icon: Lightbulb },
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

        <div className="shell:grid shell:grid-cols-2 flex flex-col gap-3.5">
          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg">Usuários por papel</h2>
                <p className="text-muted-foreground text-xs">Contas cadastradas em cada papel.</p>
              </div>
              <Link
                href="/admin/usuarios"
                className="font-heading text-primary shrink-0 text-[13px] font-bold"
              >
                Ver todos
              </Link>
            </div>
            <div className="flex flex-col">
              {PAPEIS.map((papel) => (
                <Link
                  key={papel}
                  href={`/admin/usuarios?role=${papel}`}
                  className="border-border flex items-center justify-between border-b py-3"
                >
                  <StatusBadge label={roleLabel(papel)} status={roleBadgeStatus(papel)} />
                  <span className="font-heading text-sm font-bold">{porPapel[papel] ?? "—"}</span>
                </Link>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground text-sm">Total</span>
                <span className="font-heading text-sm font-bold">{totalUsuarios ?? "—"}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-4">
              <h2 className="text-lg">Classificação da IA</h2>
              <p className="text-muted-foreground text-xs">
                Diagnósticos dos últimos 30 dias pelo resultado da IA, antes da revisão.
              </p>
            </div>
            <div className="flex flex-col">
              {NIVEIS.map((nivel) => (
                <div
                  key={nivel}
                  className="border-border flex items-center justify-between border-b py-3"
                >
                  <StatusBadge label={nivelLabel(nivel)} status={nivelBadgeStatus(nivel)} />
                  <span className="font-heading text-sm font-bold">
                    {porNivel?.find((n) => n.nivel === nivel)?.total ?? "—"}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground text-sm">Sem resultado</span>
                <span className="font-heading text-sm font-bold">
                  {resumo?.semClassificacao ?? "—"}
                </span>
              </div>
            </div>
          </Card>
        </div>

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
                href={`/admin/diagnosticos/${d.id}?voltar=/admin`}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
