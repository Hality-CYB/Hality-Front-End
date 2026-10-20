"use client";

import { cn } from "@/lib/utils";
import type { TermoConsentimento } from "@/types/consentimento";

type EscolhaConsentimentoProps = {
  termo: TermoConsentimento;
  /** `null` enquanto a pessoa não escolheu: nada vem marcado por padrão. */
  aceito: boolean | null;
  onEscolher: (aceito: boolean) => void;
  desabilitado?: boolean;
};

/**
 * Decisão explícita de um termo de consentimento (US-020): aceitar ou não,
 * com o texto e a versão vindos do back. O título é a pergunta do grupo, para
 * o leitor de tela anunciar as duas opções juntas.
 */
export function EscolhaConsentimento({
  termo,
  aceito,
  onEscolher,
  desabilitado = false,
}: EscolhaConsentimentoProps) {
  const nome = `consentimento-${termo.finalidade}`;
  const recusouObrigatorio = termo.obrigatorio && aceito === false;

  return (
    <fieldset className="border-border rounded-xl border-[1.5px] p-3.5" disabled={desabilitado}>
      <legend className="sr-only">{termo.titulo}</legend>
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-heading text-sm font-bold" aria-hidden>
          {termo.titulo}
        </span>
        <span
          className={cn(
            "font-heading shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
            termo.obrigatorio
              ? "bg-[#FEF3C7] text-[#92400E]"
              : "bg-background text-muted-foreground",
          )}
        >
          {termo.obrigatorio ? "Obrigatório" : "Opcional"}
        </span>
      </div>
      <details className="mb-2.5">
        <summary className="text-primary cursor-pointer text-[13px] font-semibold">
          Ler o termo (versão {termo.versao})
        </summary>
        <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed whitespace-pre-line">
          {termo.texto}
        </p>
      </details>
      <div className="flex gap-2">
        {[
          { valor: true, label: "Aceito" },
          { valor: false, label: "Não aceito" },
        ].map((opcao) => (
          <label
            key={opcao.label}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 text-sm font-semibold",
              aceito === opcao.valor ? "border-primary bg-secondary text-primary" : "border-border",
            )}
          >
            <input
              type="radio"
              name={nome}
              checked={aceito === opcao.valor}
              onChange={() => onEscolher(opcao.valor)}
              className="accent-primary h-4 w-4"
            />
            {opcao.label}
          </label>
        ))}
      </div>
      {recusouObrigatorio && (
        <p className="mt-2 text-[13px] text-[#B45309]">
          Sem este consentimento não é possível usar o app, porque a análise depende dos seus dados
          de saúde.
        </p>
      )}
    </fieldset>
  );
}
