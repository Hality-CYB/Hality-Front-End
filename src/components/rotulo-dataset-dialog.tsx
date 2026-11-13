"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCriarRotuloDataset } from "@/hooks/use-diagnosticos";
import { ApiError } from "@/lib/api-client";
import { nivelColor, nivelLabel } from "@/lib/level-format";
import type { RotuloDataset } from "@/types/admin";
import type { DiagnosticoNivel } from "@/types/diagnostico";

const NIVEIS: DiagnosticoNivel[] = [1, 2, 3];

type ErroRotulo = {
  mensagem: string;
  // a versão que a tela tinha ficou velha, só salva de novo depois de recarregar
  desatualizado: boolean;
};

// texto de cada erro que o back (ou a rede) pode devolver ao rotular
function erroDoRotulo(erro: unknown): ErroRotulo {
  if (erro instanceof ApiError) {
    if (erro.status === 401) {
      return {
        mensagem: "Sua sessão expirou. Entre de novo para continuar.",
        desatualizado: false,
      };
    }
    if (erro.status === 403) {
      return { mensagem: "Você não tem permissão para rotular o dataset.", desatualizado: false };
    }
    if (erro.status === 404) {
      return {
        mensagem: "Diagnóstico não encontrado. Ele pode ter sido removido.",
        desatualizado: false,
      };
    }
    if (erro.status === 409) {
      return {
        mensagem:
          "Este rótulo mudou ou o diagnóstico não pode mais ser rotulado. Recarregue para ver a versão atual.",
        desatualizado: true,
      };
    }
    if (erro.status === 422) {
      return {
        mensagem: "A classificação escolhida não é válida. Escolha outra e tente de novo.",
        desatualizado: false,
      };
    }
    return {
      mensagem: "Não foi possível salvar agora. Tente de novo em instantes.",
      desatualizado: false,
    };
  }
  // fetch sem rede dá TypeError e o timeout dá DOMException
  if (erro instanceof TypeError || erro instanceof DOMException) {
    return {
      mensagem: "Sem conexão com o servidor. Sua escolha foi mantida, tente de novo.",
      desatualizado: false,
    };
  }
  return {
    mensagem: "Não foi possível salvar agora. Tente de novo em instantes.",
    desatualizado: false,
  };
}

type FormularioProps = {
  diagnosticoId: string;
  // versão que a tela conhece (0 quando ainda não tem rótulo Hality)
  versao: number;
  nivelAtual: DiagnosticoNivel | null;
  onSalvo: (rotulo: RotuloDataset) => void;
  onCancelar: () => void;
  onRecarregar: () => Promise<unknown> | void;
};

function FormularioRotulo({
  diagnosticoId,
  versao,
  nivelAtual,
  onSalvo,
  onCancelar,
  onRecarregar,
}: FormularioProps) {
  const [nivel, setNivel] = useState<DiagnosticoNivel | null>(nivelAtual);
  const [erro, setErro] = useState<ErroRotulo | null>(null);
  const criar = useCriarRotuloDataset();
  const salvando = criar.isPending;
  const semMudanca = nivel === nivelAtual;
  const podeSalvar = nivel !== null && !semMudanca && !salvando && !erro?.desatualizado;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (nivel === null || semMudanca || salvando) return;
    setErro(null);
    try {
      const rotulo = await criar.mutateAsync({ id: diagnosticoId, nivel, versao });
      onSalvo(rotulo);
    } catch (falha) {
      // a escolha fica como estava, pra pessoa só tentar de novo
      setErro(erroDoRotulo(falha));
    }
  }

  async function recarregar() {
    await onRecarregar();
    setErro(null);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4" aria-busy={salvando}>
      <fieldset className="flex min-w-0 flex-col gap-2" disabled={salvando}>
        <legend className="font-heading mb-2 text-[13px] font-bold">Classificação do rótulo</legend>
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
              name="classificacao-rotulo"
              value={n}
              checked={nivel === n}
              onChange={() => setNivel(n)}
              className="accent-primary"
            />
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: nivelColor(n) }}
            />
            <span className="font-heading text-sm font-bold">{nivelLabel(n)}</span>
          </label>
        ))}
      </fieldset>

      {erro && <Alert type="error" message={erro.mensagem} />}
      {salvando && (
        <p role="status" className="text-muted-foreground text-xs">
          Salvando o rótulo…
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        {erro?.desatualizado ? (
          <Button type="button" onClick={recarregar}>
            Recarregar
          </Button>
        ) : (
          <Button type="submit" disabled={!podeSalvar}>
            {salvando ? "Salvando…" : "Salvar rótulo"}
          </Button>
        )}
      </div>
    </form>
  );
}

type RotuloDatasetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticoId: string;
  // rótulo Hality vigente, nulo quando o diagnóstico ainda não tem
  atual: RotuloDataset | null;
  onSalvo: (rotulo: RotuloDataset) => void;
  onRecarregar: () => Promise<unknown> | void;
  // devolve o foco pro botão que abriu a janela (o Radix só faz isso sozinho com DialogTrigger)
  onDevolverFoco?: () => void;
};

// janela pra escolher o rótulo Hality do dataset
// o Dialog já prende o foco e fecha com Escape sem salvar
export function RotuloDatasetDialog({
  open,
  onOpenChange,
  diagnosticoId,
  atual,
  onSalvo,
  onRecarregar,
  onDevolverFoco,
}: RotuloDatasetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onDevolverFoco?.();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {atual ? "Corrigir rótulo do dataset" : "Rotular para o dataset"}
          </DialogTitle>
          <DialogDescription>
            Este é o rótulo Hality da imagem, usado no dataset da IA. Ele não muda o resultado do
            diagnóstico nem o que o paciente e o profissional veem.
          </DialogDescription>
        </DialogHeader>
        <FormularioRotulo
          diagnosticoId={diagnosticoId}
          versao={atual?.versao ?? 0}
          nivelAtual={atual?.nivel ?? null}
          onSalvo={onSalvo}
          onCancelar={() => onOpenChange(false)}
          onRecarregar={onRecarregar}
        />
      </DialogContent>
    </Dialog>
  );
}
