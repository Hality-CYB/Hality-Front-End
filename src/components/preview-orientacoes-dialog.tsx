import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TipCard } from "@/components/tip-card";
import { EmptyState } from "@/components/empty-state";
import { Lightbulb } from "lucide-react";
import { nivelColor } from "@/lib/level-format";
import type { ConteudoAdmin } from "@/types/conteudo-admin";
import type { Classificacao } from "@/types/classificacao";

type PreviewOrientacoesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classificacoes: Classificacao[];
  classificacaoId: number | null;
  onClassificacaoChange: (id: number) => void;
  /** Publicados nas orientações do nível escolhido, já na ordem do back. */
  conteudos: ConteudoAdmin[];
  carregando?: boolean;
};

/** Como a aba de orientações do resultado mostra os conteúdos de cada nível. */
export function PreviewOrientacoesDialog({
  open,
  onOpenChange,
  classificacoes,
  classificacaoId,
  onClassificacaoChange,
  conteudos,
  carregando = false,
}: PreviewOrientacoesDialogProps) {
  const nivel = classificacoes.find((c) => c.id === classificacaoId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shell:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview das orientações</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div role="radiogroup" aria-label="Nível do diagnóstico" className="flex flex-wrap gap-2">
            {classificacoes.map((c) => {
              const cor = nivelColor(c.nivel);
              const ativo = c.id === classificacaoId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => onClassificacaoChange(c.id)}
                  className="font-heading rounded-4xl px-3.5 py-1.5 text-xs font-bold"
                  style={
                    ativo
                      ? { background: cor, color: "#fff", border: `1.5px solid ${cor}` }
                      : { background: `${cor}14`, color: cor, border: `1.5px solid ${cor}40` }
                  }
                >
                  {c.nome}
                </button>
              );
            })}
          </div>
          {!nivel ? (
            <p className="text-muted-foreground text-sm">Escolha um nível.</p>
          ) : carregando ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : conteudos.length === 0 ? (
            <EmptyState
              icon={<Lightbulb className="h-7 w-7" />}
              title="Nenhuma orientação cadastrada"
              description={`É o que o paciente vê hoje em ${nivel.nome}. Publique um conteúdo com esse nível nas orientações.`}
            />
          ) : (
            // Mesma grade da aba de orientações; `shrink-0` impede o flex do dialog
            // (que tem altura máxima) de espremer os cards.
            <div className="cyb-grid gap-3.5 [&>*]:shrink-0">
              {conteudos.map((c) => (
                <TipCard key={c.id} titulo={c.titulo} categoria={c.categoria} blocos={c.blocos} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
