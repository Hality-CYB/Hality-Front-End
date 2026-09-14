"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Lightbulb,
  ChevronRight,
  Image as ImageIcon,
  Video,
  FileText,
  Home,
  ScanLine,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LevelChip } from "@/components/level-chip";
import { PreviewHomeDialog } from "@/components/preview-home-dialog";
import { PreviewOrientacoesDialog } from "@/components/preview-orientacoes-dialog";
import { useDicas } from "@/hooks/use-dicas";

const ICONE_FORMATO = { texto: FileText, imagem: ImageIcon, video: Video };

export default function DicasAdminPage() {
  const { data: dicas } = useDicas();
  const ordenadas = [...(dicas ?? [])].sort((a, b) => a.ordem - b.ordem);
  const [previewHome, setPreviewHome] = useState(false);
  const [previewOrientacoes, setPreviewOrientacoes] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="p-5" style={{ background: "var(--gradient-brand)" }}>
        <h1 className="text-xl text-white">Conteúdos</h1>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <Button asChild>
          <Link href="/admin/dicas/novo">
            <Plus className="h-4 w-4" /> Nova dica de saúde
          </Link>
        </Button>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => setPreviewHome(true)}>
            <Home className="h-4 w-4" /> Preview: Home
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setPreviewOrientacoes(true)}
          >
            <ScanLine className="h-4 w-4" /> Preview: Classificações
          </Button>
        </div>

        <PreviewHomeDialog open={previewHome} onOpenChange={setPreviewHome} dicas={dicas ?? []} />
        <PreviewOrientacoesDialog
          open={previewOrientacoes}
          onOpenChange={setPreviewOrientacoes}
          dicas={dicas ?? []}
        />

        <div className="content-tip-card cyb-grid flex flex-col gap-2.5">
          {ordenadas.length === 0 && (
            <EmptyState icon={<Lightbulb className="h-7 w-7" />} title="Nenhuma dica cadastrada" />
          )}
          {ordenadas.map((dica) => {
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
                      {dica.categoria} · Ordem {dica.ordem}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dica.niveis.map((n) => (
                        <LevelChip key={n} nivel={n} size="sm" />
                      ))}
                      {dica.mostrarNaHome && <StatusBadge label="Na home" status="info" />}
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
      </div>
    </div>
  );
}
