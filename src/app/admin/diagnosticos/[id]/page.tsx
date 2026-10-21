"use client";

import { createElement, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Database,
  BadgeCheck,
  History,
  Sparkles,
} from "lucide-react";
import { CarregandoPagina, ErroPagina } from "@/components/estado-pagina";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { Alert } from "@/components/alert";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useDiagnosticoAdmin } from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { nivelColor, nivelIcon, nivelLabel } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";

/** O back manda o motivo como código; texto para os que ele usa hoje. */
const MOTIVO_DATASET: Record<string, string> = {
  exportacao_fora_do_escopo: "A exportação do dataset ainda não faz parte do escopo.",
};

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Detalhe do diagnóstico para o admin (`GET /admin/diagnosticos/{id}`).
 * O back não expõe ao admin as respostas da anamnese nem as imagens, só a
 * referência e a contagem, então esta tela não usa o DiagnosticoDetalhe
 * compartilhado do paciente/profissional. A regra do resultado é a mesma:
 * o nível revisado prevalece e o da IA vira um selo secundário.
 */
export default function DiagnosticoDetailAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const voltarHref = searchParams.get("voltar") ?? "/admin/diagnosticos";

  const { data: diagnostico, isError, error, refetch } = useDiagnosticoAdmin(id);

  // se deu erro, mostra o aviso de cada caso
  if (isError) {
    const status = error instanceof ApiError ? error.status : null;
    // no 403 e no 404 não adianta tentar de novo
    const mensagem =
      status === 404
        ? "Diagnóstico não encontrado."
        : status === 403
          ? "Você não tem permissão para ver este diagnóstico."
          : "Não foi possível carregar o diagnóstico.";
    return (
      <ErroPagina
        titulo={mensagem}
        descricao={
          status === 404
            ? "Ele pode ter sido removido."
            : status === 403
              ? "Esta área é restrita a administradores."
              : "Confira sua conexão e tente de novo."
        }
        onTentarDeNovo={status === 403 || status === 404 ? undefined : () => refetch()}
        voltar={{ href: voltarHref, label: "Voltar" }}
      />
    );
  }
  if (!diagnostico) return <CarregandoPagina />;

  const d = diagnostico;
  const hrefAtual = `/admin/diagnosticos/${id}?voltar=${encodeURIComponent(voltarHref)}`;
  const tituloResultado = !d.revisao.revisado
    ? "Classificação da IA"
    : d.nivelCorrigido
      ? "Resultado do profissional"
      : "Resultado confirmado na revisão";

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
            Diagnóstico #{d.id}
          </div>
          <div className="text-xs text-white/60">
            {new Date(d.criadoEm).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        </div>
        <StatusBadge
          label={statusDiagnosticoLabel(d.status)}
          status={statusDiagnosticoBadgeStatus(d.status)}
        />
      </div>

      <div className="shell:grid shell:grid-cols-2 shell:items-start flex flex-col gap-3.5 p-4">
        <div className="flex flex-col gap-3.5">
          <Link href={`/admin/usuarios/${d.pacienteId}?voltar=${encodeURIComponent(hrefAtual)}`}>
            <Card className="flex-row items-center gap-3 rounded-lg p-4 shadow-sm ring-0">
              <AvatarWithRole nome={d.pacienteNome} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground text-xs">Paciente</div>
                <div className="font-heading truncate text-sm font-bold">{d.pacienteNome}</div>
              </div>
              <ChevronRight className="text-gray-3 h-4 w-4" />
            </Card>
          </Link>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="font-heading text-sm font-extrabold">{tituloResultado}</div>
              {d.nivelCorrigido && d.nivelIA !== null && (
                <span className="bg-background text-muted-foreground flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
                  <Sparkles className="h-3 w-3" /> IA: {nivelLabel(d.nivelIA)}
                </span>
              )}
            </div>
            {d.erro && <Alert type="error" message={d.erro} />}
            {d.nivel !== null ? (
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${nivelColor(d.nivel)}18` }}
                >
                  {createElement(nivelIcon(d.nivel), {
                    className: "h-7 w-7",
                    style: { color: nivelColor(d.nivel) },
                  })}
                </div>
                <div className="flex flex-col gap-1">
                  <LevelChip nivel={d.nivel} size="lg" />
                  <span className="text-muted-foreground text-xs">
                    {d.confiancaIA !== null && `Confiança da IA ${d.confiancaIA}%`}
                    {d.confiancaIA !== null && d.escalaSaburra !== null && " · "}
                    {d.escalaSaburra !== null && `Saburra ${d.escalaSaburra}`}
                  </span>
                </div>
              </div>
            ) : (
              !d.erro && <p className="text-muted-foreground text-sm">Ainda sem classificação.</p>
            )}
          </Card>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-3 flex items-center gap-2 text-sm font-extrabold">
              <BadgeCheck className="text-primary h-4 w-4" /> Revisão profissional
            </div>
            {d.revisao.revisado ? (
              <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Revisado por</span>
                  <span className="font-heading font-semibold">{d.revisao.revisorNome ?? "—"}</span>
                </div>
                {d.revisao.revisadoEm && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Em</span>
                    <span className="font-heading font-semibold">
                      {dataCurta(d.revisao.revisadoEm)}
                    </span>
                  </div>
                )}
                {d.revisao.observacoes && (
                  <p className="bg-background mt-1 rounded-[10px] px-3 py-2">
                    {d.revisao.observacoes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aguardando revisão.</p>
            )}
          </Card>

          {d.historico.length > 1 && (
            <Card className="rounded-lg p-5 shadow-sm ring-0">
              <div className="font-heading mb-3 flex items-center gap-2 text-sm font-extrabold">
                <History className="text-muted-foreground h-4 w-4" /> Histórico de revisões
              </div>
              <ol className="flex flex-col gap-2.5">
                {[...d.historico].reverse().map((r, i) => (
                  <li
                    key={`${r.revisadoEm}-${i}`}
                    className="border-border flex items-start justify-between gap-3 border-b pb-2.5 text-[13px] last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-heading font-semibold">{r.revisorNome ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.revisadoEm && dataCurta(r.revisadoEm)}
                      </div>
                      {r.observacoes && <p className="mt-1">{r.observacoes}</p>}
                    </div>
                    {r.nivel !== null && <LevelChip nivel={r.nivel} size="sm" />}
                  </li>
                ))}
              </ol>
            </Card>
          )}
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
                <span className="font-heading font-semibold">
                  {d.anamneseId ? `#${d.anamneseId}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imagens</span>
                <span className="font-heading font-semibold">{d.qtdImagens}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-lg p-5 shadow-sm ring-0">
            <div className="font-heading mb-2 flex items-center gap-2 text-sm font-extrabold">
              <Database className="text-muted-foreground h-4 w-4" /> Dataset
            </div>
            <div className="mb-1">
              <StatusBadge
                label={d.dataset.disponivel ? "Disponível" : "Indisponível"}
                status={d.dataset.disponivel ? "success" : "neutral"}
              />
            </div>
            <p className="text-muted-foreground text-[13px]">
              {MOTIVO_DATASET[d.dataset.motivo] ?? d.dataset.motivo}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
