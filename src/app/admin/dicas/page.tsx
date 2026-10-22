"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Lightbulb,
  ChevronRight,
  Image as ImageIcon,
  Video,
  FileText,
  Home,
  Search,
  ListChecks,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { PreviewHomeDialog } from "@/components/preview-home-dialog";
import { PreviewOrientacoesDialog } from "@/components/preview-orientacoes-dialog";
import { useConteudosAdmin, useConteudosAdminPaginados } from "@/hooks/use-conteudos-admin";
import { useClassificacoes } from "@/hooks/use-classificacoes";
import { categoriaConteudoLabel, type ConteudoAdmin } from "@/types/conteudo-admin";
import { DESTINOS_CONTEUDO } from "@/types/conteudo";

/** O que aconteceu na tela anterior, vindo de `?aviso=` depois de salvar ou excluir. */
const AVISOS: Record<string, string> = {
  publicado: "Conteúdo publicado.",
  salvo: "Alterações salvas.",
  excluido: "Conteúdo excluído.",
};

function IconeDoConteudo({ conteudo }: { conteudo: ConteudoAdmin }) {
  const tipos = new Set(conteudo.blocos.map((b) => b.tipo));
  const Icon = tipos.has("video") ? Video : tipos.has("imagem") ? ImageIcon : FileText;
  return <Icon className="h-5 w-5" />;
}

export default function ConteudosAdminPage() {
  const aviso = AVISOS[useSearchParams().get("aviso") ?? ""];
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [previewHome, setPreviewHome] = useState(false);
  const [previewOrientacoes, setPreviewOrientacoes] = useState(false);
  const [nivelPreview, setNivelPreview] = useState<number | null>(null);
  const classificacoes = useClassificacoes();

  // Busca (no título), status e ordem de exibição são aplicados no back.
  const lista = useConteudosAdminPaginados({
    busca: buscaAdiada,
    ordem: "ordem_asc",
    limite: 20,
  });
  const conteudos = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const total = lista.data?.pages[0]?.total;

  // Os previews pedem o que a home e as orientações recebem: só publicados. O filtro
  // legado `aparece_na_home` pega também o conteúdo de antes dos destinos.
  const naHome = useConteudosAdmin(
    { publicado: true, mostrarNaHome: true, ordem: "ordem_asc", limite: 50 },
    { enabled: previewHome },
  );
  const doNivel = useConteudosAdmin(
    { publicado: true, classificacaoId: nivelPreview ?? undefined, ordem: "ordem_asc", limite: 50 },
    { enabled: previewOrientacoes && nivelPreview !== null },
  );

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Conteúdos</h1>
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo título..."
            aria-label="Buscar conteúdo"
            className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pr-3.5 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {aviso && <Alert type="success" message={aviso} />}

        <Button asChild>
          <Link href="/admin/dicas/novo">
            <Plus className="h-4 w-4" /> Novo conteúdo
          </Link>
        </Button>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => setPreviewHome(true)}>
            <Home className="h-4 w-4" /> Preview da home
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!classificacoes.data}
            onClick={() => {
              setNivelPreview((atual) => atual ?? classificacoes.data?.[0]?.id ?? null);
              setPreviewOrientacoes(true);
            }}
          >
            <ListChecks className="h-4 w-4" /> Preview das orientações
          </Button>
        </div>

        <PreviewHomeDialog
          open={previewHome}
          onOpenChange={setPreviewHome}
          conteudos={naHome.data?.itens ?? []}
          carregando={naHome.isPending}
        />
        <PreviewOrientacoesDialog
          open={previewOrientacoes}
          onOpenChange={setPreviewOrientacoes}
          classificacoes={classificacoes.data ?? []}
          classificacaoId={nivelPreview}
          onClassificacaoChange={setNivelPreview}
          conteudos={(doNivel.data?.itens ?? []).filter((c) =>
            c.destinos.includes("orientacoes_diagnostico"),
          )}
          carregando={doNivel.isPending}
        />

        {total !== undefined && (
          <span className="text-muted-foreground text-xs">
            {total} conteúdo{total === 1 ? "" : "s"}
          </span>
        )}
        {lista.isError && !lista.data && (
          <div className="flex flex-col gap-2">
            <Alert message="Não foi possível carregar os conteúdos. Confira sua conexão." />
            <Button variant="secondary" onClick={() => lista.refetch()}>
              Tentar de novo
            </Button>
          </div>
        )}
        <div className="content-tip-card cyb-grid flex flex-col gap-2.5">
          {lista.isSuccess && conteudos.length === 0 && (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nenhum conteúdo encontrado"
            />
          )}
          {conteudos.map((conteudo) => (
            <Link key={conteudo.id} href={`/admin/dicas/${conteudo.id}/editar`}>
              <Card className="content-tip-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                <div className="bg-secondary text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <IconeDoConteudo conteudo={conteudo} />
                </div>
                <div className="content-tip-card-body min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{conteudo.titulo}</div>
                  <div className="text-muted-foreground mb-1.5 truncate text-xs">
                    {categoriaConteudoLabel(conteudo.categoria)} · Ordem {conteudo.ordem}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {conteudo.destinos.length === 0 ? (
                      <StatusBadge label="Sem destino" status="neutral" />
                    ) : (
                      conteudo.destinos.map((d) => (
                        <StatusBadge key={d} label={DESTINOS_CONTEUDO[d].label} status="info" />
                      ))
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* Rascunho só existe em conteúdo antigo; salvar no editor publica. */}
                  {!conteudo.publicado && <StatusBadge label="Rascunho" status="neutral" />}
                  <ChevronRight className="text-gray-3 h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <ScrollInfinito
          temMais={!!lista.hasNextPage}
          carregando={lista.isFetchingNextPage}
          erro={lista.isFetchNextPageError}
          onCarregarMais={() => lista.fetchNextPage()}
        />
      </div>
    </div>
  );
}
