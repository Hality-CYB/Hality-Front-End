"use client";

import { createElement, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, Database, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { Alert } from "@/components/alert";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnosticoAdmin } from "@/hooks/use-diagnosticos";
import { useUsuario } from "@/hooks/use-usuarios";
import { nivelColor, nivelIcon } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";

/**
 * Detalhe do diagnóstico para o admin (`GET /admin/diagnosticos/{id}`).
 * O back não expõe ao admin as respostas da anamnese nem as imagens, só a
 * referência e a contagem, então esta tela não usa o DiagnosticoDetalhe
 * compartilhado do paciente/profissional.
 * TODO(backend): a revisão não traz o nível revisado, só data e observações.
 */
export default function DiagnosticoDetailAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/admin/diagnosticos";

  const { data: diagnostico, isError } = useDiagnosticoAdmin(id);
  const { data: paciente } = useUsuario(diagnostico?.pacienteId ?? "");
  const { data: revisor } = useUsuario(diagnostico?.revisao?.revisorId ?? "");

  if (isError) {
    return (
      <div className="p-4">
        <Alert type="error" message="Diagnóstico não encontrado." />
      </div>
    );
  }
  if (!diagnostico) return null;

  const hrefAtual = `/admin/diagnosticos/${id}?voltar=${encodeURIComponent(voltarHref)}`;
  const nomePaciente = paciente?.nome ?? "Paciente";

  return (
    <div className="flex flex-col">
      <div
        className="flex items-end justify-between gap-3 p-5"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="min-w-0">
          <Link
            href={voltarHref}
            className="font-heading mb-3 inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <div className="font-heading text-base font-extrabold text-white">
            Diagnóstico #{diagnostico.id}
          </div>
          <div className="text-xs text-white/60">
            {new Date(diagnostico.criadoEm).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        </div>
        <StatusBadge
          label={statusDiagnosticoLabel(diagnostico.status)}
          status={statusDiagnosticoBadgeStatus(diagnostico.status)}
        />
      </div>

      <div className="shell:grid shell:grid-cols-2 shell:items-start flex flex-col gap-3.5 p-4">
        <div className="flex flex-col gap-3.5">
          <Link
            href={`/admin/usuarios/${diagnostico.pacienteId}?voltar=${encodeURIComponent(hrefAtual)}`}
          >
            <Card className="flex-row items-center gap-3 rounded-lg p-4 shadow-sm ring-0">
              <AvatarWithRole nome={nomePaciente} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground text-xs">Paciente</div>
                <div className="font-heading truncate text-sm font-bold">{nomePaciente}</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-3 text-sm font-extrabold">Classificação da IA</div>
            {diagnostico.erro && <Alert type="error" message={diagnostico.erro} />}
            {diagnostico.nivelIA !== null ? (
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${nivelColor(diagnostico.nivelIA)}18` }}
                >
                  {createElement(nivelIcon(diagnostico.nivelIA), {
                    className: "h-7 w-7",
                    style: { color: nivelColor(diagnostico.nivelIA) },
                  })}
                </div>
                <div className="flex flex-col gap-1">
                  <LevelChip nivel={diagnostico.nivelIA} size="lg" />
                  <span className="text-muted-foreground text-xs">
                    {diagnostico.confiancaIA !== null && `Confiança ${diagnostico.confiancaIA}%`}
                    {diagnostico.confiancaIA !== null &&
                      diagnostico.escalaSaburra !== null &&
                      " · "}
                    {diagnostico.escalaSaburra !== null && `Saburra ${diagnostico.escalaSaburra}`}
                  </span>
                </div>
              </div>
            ) : (
              !diagnostico.erro && (
                <p className="text-muted-foreground text-sm">Ainda sem classificação.</p>
              )
            )}
          </Card>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-3 flex items-center gap-2 text-sm font-extrabold">
              <BadgeCheck className="text-primary h-4 w-4" /> Revisão profissional
            </div>
            {diagnostico.revisao ? (
              <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Revisado por</span>
                  <span className="font-heading font-semibold">{revisor?.nome ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Em</span>
                  <span className="font-heading font-semibold">
                    {new Date(diagnostico.revisao.revisadoEm).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {diagnostico.revisao.observacoes && (
                  <p className="bg-background mt-1 rounded-[10px] px-3 py-2">
                    {diagnostico.revisao.observacoes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Ainda não revisado.</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-3.5">
          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-2 flex items-center gap-2 text-sm font-extrabold">
              <Lock className="text-muted-foreground h-4 w-4" /> Dados clínicos
            </div>
            <p className="text-muted-foreground mb-3 text-[13px] leading-relaxed">
              As respostas da anamnese e as fotos não ficam visíveis para o administrador.
            </p>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anamnese</span>
                <span className="font-heading font-semibold">#{diagnostico.anamneseId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imagens</span>
                <span className="font-heading font-semibold">{diagnostico.qtdImagens}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-2 flex items-center gap-2 text-sm font-extrabold">
              <Database className="text-muted-foreground h-4 w-4" /> Dataset
            </div>
            <div className="mb-1">
              <StatusBadge
                label={diagnostico.dataset.disponivel ? "Disponível" : "Indisponível"}
                status={diagnostico.dataset.disponivel ? "success" : "neutral"}
              />
            </div>
            <p className="text-muted-foreground text-[13px]">{diagnostico.dataset.motivo}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
