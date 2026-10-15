"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Lightbulb,
  ChevronRight,
  Image as ImageIcon,
  Video,
  FileText,
  Home,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ScrollInfinito } from "@/components/scroll-infinito";
import { PreviewHomeDialog } from "@/components/preview-home-dialog";
import { useDicas, useDicasPaginadas } from "@/hooks/use-dicas";
import { cn } from "@/lib/utils";
import { categoriaDicaLabel } from "@/types/dica";

const ICONE_FORMATO = { texto: FileText, imagem: ImageIcon, video: Video, outro: FileText };

const FILTROS_STATUS: { valor: boolean | undefined; label: string }[] = [
  { valor: undefined, label: "Todos" },
  { valor: true, label: "Publicados" },
  { valor: false, label: "Rascunhos" },
];

export default function DicasAdminPage() {
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [publicado, setPublicado] = useState<boolean | undefined>(undefined);
  const [previewHome, setPreviewHome] = useState(false);

  // Busca (no título), status e ordem de exibição são aplicados no back.
  const lista = useDicasPaginadas({
    busca: buscaAdiada,
    publicado,
    ordem: "ordem_asc",
    limite: 20,
  });
  const dicas = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const total = lista.data?.pages[0]?.total;

  // O preview mostra só o que a home do paciente recebe: publicados e marcados para a home.
  const naHome = useDicas(
    { publicado: true, mostrarNaHome: true, ordem: "ordem_asc", limite: 50 },
    { enabled: previewHome },
  );

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="mb-3 text-xl text-white">Conteúdos</h1>
        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo título..."
            aria-label="Buscar conteúdo"
            className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pr-3.5 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.label}
              onClick={() => setPublicado(f.valor)}
              className={cn(
                "font-heading shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                publicado === f.valor
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
          <Link href="/admin/dicas/novo">
            <Plus className="h-4 w-4" /> Nova dica de saúde
          </Link>
        </Button>

        {/* TODO(backend): o preview das orientações por nível saiu: sem rota que liste
            as classificações, o front não sabe qual `classificacao_id` é qual nível. */}
        <Button variant="secondary" onClick={() => setPreviewHome(true)}>
          <Home className="h-4 w-4" /> Preview: Home
        </Button>

        <PreviewHomeDialog
          open={previewHome}
          onOpenChange={setPreviewHome}
          dicas={naHome.data?.itens ?? []}
        />

        {total !== undefined && (
          <span className="text-muted-foreground text-xs">
            {total} conteúdo{total === 1 ? "" : "s"}
          </span>
        )}
        <div className="content-tip-card cyb-grid flex flex-col gap-2.5">
          {lista.isSuccess && dicas.length === 0 && (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nenhum conteúdo encontrado"
            />
          )}
          {dicas.map((dica) => {
            const Icon = ICONE_FORMATO[dica.formato];
            return (
              <Link key={dica.id} href={`/admin/dicas/${dica.id}/editar`}>
                <Card className="content-tip-card flex-row items-center gap-3.5 rounded-lg p-4 shadow-sm ring-0">
                  <div className="bg-secondary text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="content-tip-card-body min-w-0 flex-1">
                    <div className="font-heading truncate text-sm font-bold">{dica.titulo}</div>
                    <div className="text-muted-foreground mb-1.5 truncate text-xs">
                      {categoriaDicaLabel(dica.categoria)} · Ordem {dica.ordem}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dica.mostrarNaHome && <StatusBadge label="Na home" status="info" />}
                      {dica.classificacaoIds.length > 0 && (
                        <StatusBadge label="Nas orientações" status="neutral" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge
                      label={dica.publicado ? "Publicado" : "Rascunho"}
                      status={dica.publicado ? "success" : "neutral"}
                    />
                    <ChevronRight className="text-gray-3 h-4 w-4" />
                  </div>
                </Card>
              </Link>
            );
          })}
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
