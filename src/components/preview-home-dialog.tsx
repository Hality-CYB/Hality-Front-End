import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { Lightbulb } from "lucide-react";
import type { Dica } from "@/types/dica";

type PreviewHomeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dicas: Dica[];
};

/** Porta Design/'s HomePreviewModal — como a home do paciente mostra as dicas publicadas. */
export function PreviewHomeDialog({ open, onOpenChange, dicas }: PreviewHomeDialogProps) {
  const dicasHome = dicas
    .filter((d) => d.publicado && d.mostrarNaHome)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview — Home do paciente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-xs">
            Assim aparecem as dicas na aba &quot;Dicas para você&quot; da home do paciente, na ordem
            configurada.
          </p>
          {dicasHome.length === 0 ? (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nenhuma dica na home"
              description='Marque dicas com o toggle "Aparecer na home" pra elas aparecerem aqui.'
            />
          ) : (
            dicasHome.map((dica) => (
              <TipCard
                key={dica.id}
                titulo={dica.titulo}
                categoria={dica.categoria}
                corpo={dica.corpo}
                formato={dica.formato}
                midiaUrl={dica.midiaUrl}
                compact
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
