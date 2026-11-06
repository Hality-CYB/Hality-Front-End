"use client";

import { useRef, useState, type ReactNode } from "react";
import { LevelChip } from "@/components/level-chip";
import { RotuloDatasetDialog } from "@/components/rotulo-dataset-dialog";
import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/datas";
import type { DiagnosticoAdminDetalhe, FonteRotulo, RotuloDataset } from "@/types/admin";

const FONTE_LABEL: Record<FonteRotulo, string> = {
  hality: "rótulo Hality",
  profissional: "revisão do profissional",
  ia: "classificação da IA",
};

// o back manda o motivo como código, aqui fica o texto de cada um
const MOTIVO_EXPORTACAO: Record<string, string> = {
  sem_rotulo_humano: "Ainda não tem rótulo de uma pessoa (Hality ou profissional).",
  sem_consentimento: "O paciente não autorizou o uso da imagem no dataset.",
};

function Linha({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{titulo}</dt>
      <dd className="flex flex-col items-end gap-1 text-right">{children}</dd>
    </div>
  );
}

function detalheDoRotulo(r: RotuloDataset) {
  return `Versão ${r.versao} · ${r.autorNome} · ${formatarDataHora(r.criadoEm)}`;
}

// rótulo Hality do dataset dentro do card Dataset do detalhe do admin
// mostra a IA, a revisão do profissional e o rótulo Hality em linhas separadas
export function RotuloDatasetSecao({
  diagnostico: d,
  onRecarregar,
}: {
  diagnostico: DiagnosticoAdminDetalhe;
  onRecarregar: () => Promise<unknown> | void;
}) {
  const [aberto, setAberto] = useState(false);
  // aviso lido por leitor de tela, só aparece depois que o servidor confirmou
  const [aviso, setAviso] = useState("");
  // o botão que abre a janela, pra devolver o foco pra ele quando ela fecha
  const botaoRef = useRef<HTMLButtonElement>(null);
  const { atual, historico, fonteEfetiva, exportavel, motivo } = d.rotuloDataset;

  // mesma regra do back: concluído, com classificação da IA e com imagem
  const podeRotular = d.status === "concluido" && d.nivelIA !== null && d.qtdImagens > 0;
  const revisaoComNivel = d.revisao.revisado && d.revisao.nivel !== null;

  return (
    <section aria-labelledby="rotulo-dataset-titulo" className="border-border mt-3 border-t pt-3">
      <h3 id="rotulo-dataset-titulo" className="font-heading mb-2 text-[13px] font-extrabold">
        Rótulo para o dataset
      </h3>

      <dl className="flex flex-col gap-2 text-[13px]">
        <Linha titulo="Classificação automática">
          {d.nivelIA !== null ? (
            <LevelChip nivel={d.nivelIA} size="sm" />
          ) : (
            <span className="text-muted-foreground">Sem classificação</span>
          )}
        </Linha>
        <Linha titulo="Revisão do profissional">
          {revisaoComNivel ? (
            <LevelChip nivel={d.revisao.nivel} size="sm" />
          ) : (
            <span className="text-muted-foreground">
              {d.revisao.revisado ? "Revisado, sem classificação" : "Sem revisão"}
            </span>
          )}
        </Linha>
        <Linha titulo="Rótulo Hality">
          {atual ? (
            <>
              <LevelChip nivel={atual.nivel} size="sm" />
              <span className="text-muted-foreground text-xs">{detalheDoRotulo(atual)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Sem rótulo Hality</span>
          )}
        </Linha>
      </dl>

      <p className="text-muted-foreground mt-3 text-[13px]">
        Vale para o dataset:{" "}
        <strong className="text-foreground">{FONTE_LABEL[fonteEfetiva]}</strong>
        {!exportavel && motivo && ` · ${MOTIVO_EXPORTACAO[motivo] ?? motivo}`}
      </p>

      {podeRotular ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          ref={botaoRef}
          aria-haspopup="dialog"
          onClick={() => setAberto(true)}
        >
          {atual ? "Corrigir rótulo" : "Rotular"}
        </Button>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          Só dá para rotular diagnóstico concluído, com classificação da IA e imagem.
        </p>
      )}

      {historico.length > 0 && (
        <div className="mt-4">
          <h4 className="font-heading mb-2 text-xs font-extrabold">Histórico do rótulo Hality</h4>
          <ol className="flex flex-col gap-2">
            {historico.map((r) => (
              <li
                key={r.id}
                className="border-border flex items-start justify-between gap-3 border-b pb-2 text-xs last:border-b-0 last:pb-0"
              >
                <span className="text-muted-foreground">{detalheDoRotulo(r)}</span>
                <LevelChip nivel={r.nivel} size="sm" />
              </li>
            ))}
          </ol>
        </div>
      )}

      <p role="status" className="sr-only">
        {aviso}
      </p>

      <RotuloDatasetDialog
        open={aberto}
        onOpenChange={setAberto}
        diagnosticoId={d.id}
        atual={atual}
        onRecarregar={onRecarregar}
        onDevolverFoco={() => botaoRef.current?.focus()}
        onSalvo={(rotulo) => {
          setAberto(false);
          setAviso(`Rótulo Hality salvo, versão ${rotulo.versao}.`);
        }}
      />
    </section>
  );
}
