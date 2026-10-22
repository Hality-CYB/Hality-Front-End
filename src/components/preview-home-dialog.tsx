import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { Lightbulb } from "lucide-react";
import type { ConteudoAdmin } from "@/types/conteudo-admin";

type PreviewHomeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Publicados que vão para a home, já na ordem do back. */
  conteudos: ConteudoAdmin[];
  carregando?: boolean;
};

/** Como a seção "Dicas para você" da home do paciente mostra os conteúdos publicados. */
export function PreviewHomeDialog({
  open,
  onOpenChange,
  conteudos,
  carregando = false,
}: PreviewHomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shell:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview da home do paciente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-xs">
            Assim aparecem os conteúdos em &quot;Dicas para você&quot;, na ordem configurada.
          </p>
          {carregando ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : conteudos.length === 0 ? (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nada na home"
              description='Publique um conteúdo com o destino "Home do paciente" para ele aparecer aqui.'
            />
          ) : (
            // Mesma grade da home do paciente; `shrink-0` impede o flex do dialog
            // (que tem altura máxima) de espremer os cards.
            <div className="cyb-grid cyb-grid--stretch gap-2.5 [&>*]:shrink-0">
              {conteudos.map((c) => (
                <TipCard
                  key={c.id}
                  titulo={c.titulo}
                  categoria={c.categoria}
                  blocos={c.blocos}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
