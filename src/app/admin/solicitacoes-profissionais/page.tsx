"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  useDecidirSolicitacaoProfissional,
  useSolicitacoesProfissionais,
} from "@/hooks/use-solicitacoes-profissionais";
import { formatarData } from "@/lib/datas";
import { formatarTelefone } from "@/lib/telefone";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SolicitacaoProfissional, StatusSolicitacao } from "@/types/solicitacao-profissional";

const FILTROS: { status: StatusSolicitacao; label: string }[] = [
  { status: "pendente", label: "Pendentes" },
  { status: "aprovada", label: "Aprovadas" },
  { status: "recusada", label: "Recusadas" },
];

export default function SolicitacoesProfissionaisPage() {
  const [status, setStatus] = useState<StatusSolicitacao>("pendente");
  const [decisao, setDecisao] = useState<{
    solicitacao: SolicitacaoProfissional;
    resultado: "aprovada" | "recusada";
  } | null>(null);
  const lista = useSolicitacoesProfissionais(status);
  const decidir = useDecidirSolicitacaoProfissional();
  const itens = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const aprovando = decisao?.resultado === "aprovada";

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <Link
          href="/admin/usuarios"
          className="mb-3 inline-flex items-center gap-1 text-sm text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Usuários
        </Link>
        <h1 className="font-heading text-xl font-extrabold text-white">
          Solicitações profissionais
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Confira o registro e os dados do profissional antes de liberar o acesso.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Status da solicitação">
          {FILTROS.map((f) => (
            <button
              key={f.status}
              aria-pressed={f.status === status}
              onClick={() => {
                setStatus(f.status);
                decidir.reset();
              }}
              className={cn(
                "font-heading rounded-4xl px-3.5 py-1.5 text-xs font-bold",
                f.status === status ? "text-primary bg-white" : "bg-white/15 text-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-3 p-4">
        {decidir.isSuccess && (
          <Alert
            type="success"
            message={
              decidir.data.status === "aprovada"
                ? "Solicitação aprovada. Convite de ativação enfileirado para envio por e-mail."
                : "Solicitação recusada. Notificação enfileirada para envio por e-mail."
            }
          />
        )}
        {lista.isPending && (
          <p role="status" className="text-muted-foreground text-sm">
            Carregando solicitações…
          </p>
        )}
        {lista.isError && (
          <>
            <Alert message="Não foi possível carregar as solicitações." />
            <Button variant="secondary" onClick={() => lista.refetch()}>
              Tentar novamente
            </Button>
          </>
        )}
        {lista.isSuccess && itens.length === 0 && (
          <EmptyState
            icon={<ClipboardCheck className="h-7 w-7" />}
            title="Nenhuma solicitação encontrada"
          />
        )}
        <div className="cyb-grid min-w-0 gap-3">
          {itens.map((s) => (
            <Card key={s.id} className="min-w-0 gap-3 rounded-lg p-5 shadow-sm ring-0">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-base font-bold break-words">{s.nome}</h2>
                <StatusBadge
                  label={
                    s.status === "pendente"
                      ? "Aguardando análise"
                      : s.status === "aprovada"
                        ? "Aprovada"
                        : "Recusada"
                  }
                  status={
                    s.status === "pendente"
                      ? "pending"
                      : s.status === "aprovada"
                        ? "success"
                        : "danger"
                  }
                />
              </div>
              <dl className="grid min-w-0 gap-2 text-sm">
                {[
                  ["E-mail", s.email],
                  ["Telefone", formatarTelefone(s.telefone) || "—"],
                  ["Registro profissional", s.registro_profissional],
                  ["Especialidade", s.especialidade],
                  ["Solicitado em", formatarData(s.created_at)],
                ].map(([label, valor]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="[overflow-wrap:anywhere] break-words">{valor}</dd>
                  </div>
                ))}
              </dl>
              {s.status === "pendente" ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={decidir.isPending}
                    onClick={() => {
                      decidir.reset();
                      setDecisao({ solicitacao: s, resultado: "aprovada" });
                    }}
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={decidir.isPending}
                    onClick={() => {
                      decidir.reset();
                      setDecisao({ solicitacao: s, resultado: "recusada" });
                    }}
                  >
                    Recusar
                  </Button>
                </div>
              ) : (
                s.usuario_id && (
                  <Button variant="secondary" asChild>
                    <Link href={`/admin/usuarios/${s.usuario_id}`}>Ver conta profissional</Link>
                  </Button>
                )
              )}
            </Card>
          ))}
        </div>
        <ScrollInfinito
          temMais={!!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
      <AlertDialog
        open={decisao !== null}
        onOpenChange={(open) => {
          if (!open && !decidir.isPending) setDecisao(null);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            if (decidir.isPending) e.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {aprovando ? "Aprovar acesso profissional?" : "Recusar solicitação?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {decisao?.solicitacao.nome}:{" "}
              {aprovando
                ? "Confirme que verificou os dados e o registro profissional. Um convite será enviado para confirmar o e-mail e definir a senha. A aprovação não concede vínculo com a equipe Hality."
                : "O solicitante será informado por e-mail e não terá acesso profissional."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {decidir.isError && (
            <Alert
              message={
                decidir.error instanceof ApiError && decidir.error.status === 409
                  ? "A solicitação já foi decidida ou o e-mail já possui conta. Feche e confira a lista atualizada."
                  : "Não foi possível salvar a decisão. Tente novamente."
              }
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decidir.isPending}>Cancelar</AlertDialogCancel>
            <Button
              disabled={decidir.isPending}
              onClick={() => {
                if (decisao)
                  decidir.mutate(
                    { id: decisao.solicitacao.id, decisao: decisao.resultado },
                    { onSuccess: () => setDecisao(null) },
                  );
              }}
            >
              {decidir.isPending
                ? "Salvando…"
                : aprovando
                  ? "Confirmar aprovação"
                  : "Confirmar recusa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
