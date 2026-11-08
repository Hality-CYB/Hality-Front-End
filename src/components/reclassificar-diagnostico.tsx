"use client";

import { useState, type FormEvent } from "react";
import { Scale } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import type { DiagnosticoNivel } from "@/types/diagnostico";

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

type ReclassificarDiagnosticoProps = {
  /** Classificação que o paciente vê hoje. */
  nivelAtual: DiagnosticoNivel | null;
  /** Último revisor, se foi um profissional: é quem precisa saber da mudança. */
  profissionalNome: string | null;
  revisadaPorProfissional: boolean;
  salvando: boolean;
  erro: string | null;
  /** A versão que a tela tinha ficou velha: só dá para continuar depois de recarregar. */
  desatualizado: boolean;
  concluido: boolean;
  onConfirmar: (dados: { nivel: DiagnosticoNivel; observacoes: string }) => void;
  onRecarregar: () => void;
  onLimparErro: () => void;
};

/**
 * Botão e janela da reclassificação do resultado pelo admin. Ela muda o que o
 * paciente vê, por isso passa sempre por uma confirmação. O aviso de sucesso
 * fica com quem usa o componente, perto do resultado.
 */
export function ReclassificarDiagnostico({
  nivelAtual,
  profissionalNome,
  revisadaPorProfissional,
  salvando,
  erro,
  desatualizado,
  concluido,
  onConfirmar,
  onRecarregar,
  onLimparErro,
}: ReclassificarDiagnosticoProps) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [nivel, setNivel] = useState<DiagnosticoNivel | null>(nivelAtual);
  const [observacoes, setObservacoes] = useState("");

  const podeContinuar = nivel !== null && nivel !== nivelAtual;
  const profissional = profissionalNome ?? "O profissional";

  // Fechar a janela depois de salvar: `concluido` muda quando o servidor confirma.
  const [concluidoAntes, setConcluidoAntes] = useState(concluido);
  if (concluido !== concluidoAntes) {
    setConcluidoAntes(concluido);
    if (concluido) setAberto(false);
  }

  function abrir() {
    setNivel(nivelAtual);
    setObservacoes("");
    setConfirmando(false);
    onLimparErro();
    setAberto(true);
  }

  function continuar(e: FormEvent) {
    e.preventDefault();
    if (podeContinuar) setConfirmando(true);
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={abrir}>
        <Scale className="h-3.5 w-3.5" /> Reclassificar
      </Button>

      <Dialog open={aberto} onOpenChange={(open) => !salvando && setAberto(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmando ? "Confirmar reclassificação" : "Reclassificar diagnóstico"}
            </DialogTitle>
            <DialogDescription>
              {confirmando
                ? "Confira antes de confirmar. A mudança fica no histórico de revisões."
                : "Escolha o resultado que o paciente deve ver."}
            </DialogDescription>
          </DialogHeader>

          {confirmando && nivel !== null ? (
            <div className="flex flex-col gap-4" aria-busy={salvando}>
              {revisadaPorProfissional && nivelAtual !== null ? (
                <Alert
                  type="info"
                  message={`${profissional} já revisou este diagnóstico como ${nivelLabel(nivelAtual)}. Ao confirmar, o resultado passa a ser ${nivelLabel(nivel)}, e ${profissional} recebe um e-mail avisando da mudança.`}
                />
              ) : (
                <Alert
                  type="info"
                  message={`Nenhum profissional revisou este diagnóstico ainda. Ao confirmar, o resultado passa a ser ${nivelLabel(nivel)}.`}
                />
              )}
              <p className="text-muted-foreground text-[13px]">
                O paciente vê o novo resultado e recebe um e-mail.
              </p>
              {erro && <Alert type="error" message={erro} />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={salvando}
                  onClick={() => {
                    onLimparErro();
                    setConfirmando(false);
                  }}
                >
                  Voltar
                </Button>
                {desatualizado ? (
                  <Button
                    type="button"
                    onClick={() => {
                      onRecarregar();
                      setAberto(false);
                    }}
                  >
                    Recarregar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={salvando}
                    onClick={() => onConfirmar({ nivel, observacoes })}
                  >
                    {salvando ? "Salvando…" : "Confirmar reclassificação"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={continuar} className="flex flex-col gap-4">
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="font-heading mb-2 text-[13px] font-bold">Classificação</legend>
                {NIVEIS.map((n) => (
                  <label
                    key={n}
                    className="has-focus-visible:ring-ring flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3.5 has-focus-visible:ring-2"
                    style={{
                      borderColor: nivel === n ? nivelColor(n) : "var(--border)",
                      background: nivel === n ? `${nivelColor(n)}10` : "var(--card)",
                    }}
                  >
                    <input
                      type="radio"
                      name="classificacao-reclassificacao"
                      value={n}
                      checked={nivel === n}
                      onChange={() => setNivel(n)}
                      className="accent-primary"
                    />
                    <span className="font-heading text-sm font-bold">
                      {nivelLabel(n)}
                      {n === nivelAtual && " (atual)"}
                    </span>
                  </label>
                ))}
              </fieldset>
              <div>
                <label
                  htmlFor="observacoes-reclassificacao"
                  className="font-heading mb-2 block text-[13px] font-bold"
                >
                  Observações (opcional)
                </label>
                <Textarea
                  id="observacoes-reclassificacao"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!podeContinuar}>
                  Continuar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
