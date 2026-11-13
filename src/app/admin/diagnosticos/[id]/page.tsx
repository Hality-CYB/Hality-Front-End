"use client";

import { createElement, use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  BadgeCheck,
  History,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { CarregandoPagina, ErroPagina } from "@/components/estado-pagina";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { LevelChip } from "@/components/level-chip";
import { Alert } from "@/components/alert";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { ReclassificarDiagnostico } from "@/components/reclassificar-diagnostico";
import { RotuloDatasetSecao } from "@/components/rotulo-dataset-secao";
import { FotoAmpliavel } from "@/components/foto-ampliavel";
import {
  erroDaReclassificacao,
  useDiagnosticoAdmin,
  useReclassificarDiagnostico,
} from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { nivelColor, nivelIcon, nivelLabel } from "@/lib/level-format";
import { statusDiagnosticoLabel, statusDiagnosticoBadgeStatus } from "@/lib/status-format";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarResposta } from "@/lib/anamnese-format";
import { urlDaApi } from "@/lib/url-da-api";
import { cn } from "@/lib/utils";

/**
 * Detalhe do diagnóstico para o admin (`GET /admin/diagnosticos/{id}`).
 * Mostra a foto e a anamnese para o admin rotular e reclassificar; o back
 * registra cada abertura. Tem tela própria (e não o DiagnosticoDetalhe do
 * paciente/profissional) por causa da reclassificação e do dataset, mas a regra
 * do resultado é a mesma: o nível revisado prevalece e o da IA vira um selo.
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
  const reclassificar = useReclassificarDiagnostico();
  const [reclassificado, setReclassificado] = useState(false);
  const [anamneseAberta, setAnamneseAberta] = useState(true);
  const [fotoFalhou, setFotoFalhou] = useState(false);

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
  const versaoDaRevisao = d.reclassificacao?.versao ?? 0;
  const hrefAtual = `/admin/diagnosticos/${id}?voltar=${encodeURIComponent(voltarHref)}`;
  const revisado = d.revisao.revisado;
  const podeReclassificar =
    d.reclassificacao !== null && (d.status === "concluido" || d.status === "aguardando_revisao");
  const detalhesIA = [
    d.confiancaIA !== null && `Escala de halitose ${d.confiancaIA}%`,
    d.escalaSaburra !== null && `Saburra ${d.escalaSaburra}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const anteriores = d.historico.length > 1 ? [...d.historico].reverse() : [];

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
          <div className="text-xs text-white/60">{formatarDataHora(d.criadoEm)}</div>
        </div>
        <StatusBadge
          label={statusDiagnosticoLabel(d.status)}
          status={statusDiagnosticoBadgeStatus(d.status)}
        />
      </div>

      {/* No celular o paciente vem primeiro; no desktop ele abre a coluna lateral. */}
      <div className="shell:grid shell:grid-cols-[minmax(0,1fr)_300px] shell:grid-rows-[auto_auto_auto_1fr] shell:items-start flex flex-col gap-3.5 p-4">
        <Link
          href={`/admin/usuarios/${d.pacienteId}?voltar=${encodeURIComponent(hrefAtual)}`}
          className="shell:col-start-2 shell:row-start-1"
        >
          <Card className="flex-row items-center gap-3 rounded-lg p-4 shadow-sm ring-0">
            <AvatarWithRole nome={d.pacienteNome} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground text-xs">Paciente</div>
              <div className="font-heading truncate text-sm font-bold">{d.pacienteNome}</div>
            </div>
            <ChevronRight className="text-gray-3 h-4 w-4" />
          </Card>
        </Link>

        <Card className="shell:col-start-2 shell:row-start-2 gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
          <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-[#0a3d4a]">
            {d.fotoUrl && !fotoFalhou ? (
              <FotoAmpliavel
                src={urlDaApi(d.fotoUrl)}
                alt={`Foto da língua do diagnóstico #${d.id}`}
                onError={() => setFotoFalhou(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-9 w-9 text-white/25" aria-hidden />
                <span className="text-xs text-white/40">
                  {fotoFalhou ? "Não foi possível carregar a foto" : "Sem foto"}
                </span>
              </div>
            )}
          </div>
        </Card>

        <div className="shell:col-start-1 shell:row-span-4 shell:row-start-1 flex min-w-0 flex-col gap-3.5">
          <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="font-heading text-sm font-extrabold">
                {revisado ? "Resultado revisado" : "Classificação da IA"}
              </div>
              {podeReclassificar && d.reclassificacao && (
                <ReclassificarDiagnostico
                  nivelAtual={d.revisao.nivel ?? d.nivelIA}
                  profissionalNome={d.revisao.revisorNome}
                  revisadaPorProfissional={d.reclassificacao.revisadaPorProfissional}
                  salvando={reclassificar.isPending}
                  erro={
                    reclassificar.isError
                      ? erroDaReclassificacao(reclassificar.error).mensagem
                      : null
                  }
                  desatualizado={
                    reclassificar.isError &&
                    erroDaReclassificacao(reclassificar.error).desatualizado
                  }
                  concluido={reclassificado}
                  onConfirmar={({ nivel, observacoes }) =>
                    reclassificar.mutate(
                      { id, nivel, observacoes, versao: versaoDaRevisao },
                      { onSuccess: () => setReclassificado(true) },
                    )
                  }
                  onRecarregar={() => {
                    reclassificar.reset();
                    refetch();
                  }}
                  onLimparErro={() => {
                    reclassificar.reset();
                    setReclassificado(false);
                  }}
                />
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
                <div className="flex min-w-0 flex-col gap-1">
                  <LevelChip nivel={d.nivel} size="lg" />
                  {!revisado && detalhesIA && (
                    <span className="text-muted-foreground text-xs">{detalhesIA}</span>
                  )}
                </div>
              </div>
            ) : (
              !d.erro && <p className="text-muted-foreground text-sm">Ainda sem classificação.</p>
            )}

            {reclassificado && (
              <div className="mt-4">
                <Alert type="success" message="Reclassificação salva. O paciente será avisado." />
              </div>
            )}

            <div className="border-border mt-4 flex flex-col gap-2 border-t pt-4 text-[13px]">
              {revisado ? (
                <>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="text-primary h-4 w-4 shrink-0" />
                    <span>
                      Revisado por{" "}
                      <span className="font-heading font-semibold">
                        {d.revisao.revisorNome ?? "—"}
                      </span>
                      {d.revisao.revisadoEm && ` em ${formatarData(d.revisao.revisadoEm)}`}
                    </span>
                  </div>
                  {d.revisao.observacoes && (
                    <p className="bg-background rounded-[10px] px-3 py-2">
                      {d.revisao.observacoes}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Aguardando revisão.</p>
              )}
              {revisado && d.nivelIA !== null && (
                <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                  <Sparkles className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>
                    IA: {nivelLabel(d.nivelIA)}
                    {detalhesIA && ` · ${detalhesIA}`}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-sm ring-0">
            <button
              type="button"
              onClick={() => setAnamneseAberta((aberta) => !aberta)}
              aria-expanded={anamneseAberta}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <span className="font-heading flex items-center gap-2 text-sm font-extrabold">
                <ClipboardList className="text-muted-foreground h-4 w-4" /> Anamnese
              </span>
              <ChevronRight
                className={cn(
                  "text-gray-3 h-4 w-4 transition-transform",
                  anamneseAberta && "rotate-90",
                )}
              />
            </button>
            {anamneseAberta && (
              <div className="shell:grid shell:grid-cols-2 flex flex-col gap-1.5 px-5 pb-5">
                {d.respostasAnamnese?.length ? (
                  d.respostasAnamnese.map((r) => (
                    <div
                      key={r.perguntaId}
                      className="bg-background flex justify-between gap-3 rounded-[10px] px-3 py-2"
                    >
                      <span className="text-muted-foreground text-[13px]">{r.enunciado}</span>
                      <span className="font-heading shrink-0 text-[13px] font-semibold">
                        {formatarResposta(r.tipo, r.valor)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-[13px]">Sem respostas registradas.</p>
                )}
              </div>
            )}
          </Card>

          {anteriores.length > 0 && (
            <Card className="gap-0 rounded-lg p-5 shadow-sm ring-0">
              <div className="font-heading mb-3 flex items-center gap-2 text-sm font-extrabold">
                <History className="text-muted-foreground h-4 w-4" /> Histórico de revisões
              </div>
              <ol className="flex flex-col gap-2.5">
                {anteriores.map((r, i) => (
                  <li
                    key={`${r.revisadoEm}-${i}`}
                    className="border-border flex items-start justify-between gap-3 border-b pb-2.5 text-[13px] last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-heading font-semibold">{r.revisorNome ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.revisadoEm && formatarData(r.revisadoEm)}
                        {i === 0 && " · atual"}
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

        <Card className="shell:col-start-2 shell:row-start-3 gap-0 rounded-lg p-5 shadow-sm ring-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="font-heading flex items-center gap-2 text-sm font-extrabold">
              <Database className="text-muted-foreground h-4 w-4" /> Dataset
            </div>
          </div>
          <p className="text-muted-foreground text-[13px]">
            A exportação é feita pela{" "}
            <Link className="text-primary underline" href="/admin/diagnosticos">
              fila de diagnósticos
            </Link>
            .
          </p>
          <RotuloDatasetSecao diagnostico={d} onRecarregar={() => refetch()} />
        </Card>
      </div>
    </div>
  );
}
