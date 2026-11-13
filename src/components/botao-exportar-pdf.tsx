import { FileDown, LoaderCircle } from "lucide-react";

type BotaoExportarPdfProps = {
  onExportar: () => void;
  gerando: boolean;
  erro: string | null;
};

/** Botão do cabeçalho do detalhe que gera o relatório em PDF. */
export function BotaoExportarPdf({ onExportar, gerando, erro }: BotaoExportarPdfProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onExportar}
        disabled={gerando}
        aria-describedby={erro ? "erro-exportar-pdf" : undefined}
        className="font-heading inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-70"
      >
        {gerando ? (
          <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
        ) : (
          <FileDown className="h-3.5 w-3.5" aria-hidden />
        )}
        {gerando ? "Gerando PDF…" : erro ? "Tentar de novo" : "Exportar PDF"}
      </button>
      {erro && (
        <p id="erro-exportar-pdf" role="alert" className="text-[11px] text-white/80">
          {erro}
        </p>
      )}
    </div>
  );
}
