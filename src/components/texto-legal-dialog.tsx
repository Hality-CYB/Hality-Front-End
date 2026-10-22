import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DocumentoLegal } from "@/lib/documentos-legais";

type TextoLegalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  /** Ex.: data de atualização ou versão do termo. */
  subtitulo?: string;
  children: ReactNode;
};

/** Pop-up de leitura de um termo ou documento legal. */
export function TextoLegalDialog({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  children,
}: TextoLegalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shell:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{titulo}</DialogTitle>
          {subtitulo && <p className="text-muted-foreground text-xs">{subtitulo}</p>}
        </DialogHeader>
        <div className="text-muted-foreground flex flex-col gap-2.5 text-[13px] leading-relaxed">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Agrupa as linhas: as que começam com "- " viram uma lista, as outras, parágrafos. */
function Linhas({
  linhas,
  ehTitulo,
}: {
  linhas: string[];
  ehTitulo?: (linha: string, proxima?: string) => boolean;
}) {
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  const fecharLista = () => {
    if (lista.length === 0) return;
    blocos.push(
      <ul key={`l${blocos.length}`} className="list-disc space-y-1 pl-5">
        {lista.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>,
    );
    lista = [];
  };
  linhas.forEach((linha, i) => {
    if (linha.startsWith("- ")) {
      lista.push(linha.slice(2));
      return;
    }
    fecharLista();
    if (!linha.trim()) return;
    blocos.push(
      ehTitulo?.(linha, linhas[i + 1]) ? (
        <h3 key={`t${i}`} className="font-heading text-foreground mt-1 text-sm font-bold">
          {linha}
        </h3>
      ) : (
        <p key={`p${i}`}>{linha}</p>
      ),
    );
  });
  fecharLista();
  return <>{blocos}</>;
}

export function DocumentoLegalConteudo({ documento }: { documento: DocumentoLegal }) {
  return (
    <>
      {documento.secoes.map((secao) => (
        <section key={secao.titulo} className="flex flex-col gap-1.5">
          <h3 className="font-heading text-foreground mt-1 text-sm font-bold">{secao.titulo}</h3>
          <Linhas linhas={secao.linhas} />
        </section>
      ))}
    </>
  );
}

/**
 * Texto de um termo de consentimento, como o back manda (texto puro). Linha
 * curta, sem pontuação final e seguida de conteúdo vira subtítulo.
 */
export function TermoConsentimentoConteudo({ texto }: { texto: string }) {
  const ehTitulo = (linha: string, proxima?: string) =>
    linha.length <= 40 && !/[.:;!?\])]$/.test(linha) && !!proxima?.trim();
  return <Linhas linhas={texto.split("\n")} ehTitulo={ehTitulo} />;
}
