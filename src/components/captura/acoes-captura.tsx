import { Camera, Check, ChevronLeft, ImageUp, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type AcoesCapturaProps = {
  aoVivo: boolean;
  contando: boolean;
  ocupado: boolean;
  capturaDesabilitada: boolean;
  onCapturar: () => void;
  onGaleria: () => void;
  onVoltar: () => void;
  onUsarFoto: () => void;
  onTirarOutra: () => void;
};

export function AcoesCaptura(props: AcoesCapturaProps) {
  return (
    <>
      <AcoesWeb {...props} />
      <AcoesMobile {...props} />
    </>
  );
}

function AcoesWeb({
  aoVivo,
  contando,
  ocupado,
  capturaDesabilitada,
  onCapturar,
  onGaleria,
  onVoltar,
  onUsarFoto,
  onTirarOutra,
}: AcoesCapturaProps) {
  return (
    <div className="shell:flex hidden flex-col gap-2.5">
      {aoVivo ? (
        <Button size="lg" variant="success" onClick={onCapturar} disabled={capturaDesabilitada}>
          <Camera className="h-4.5 w-4.5" /> Capturar foto
        </Button>
      ) : (
        <Button size="lg" variant="success" onClick={onUsarFoto} disabled={ocupado}>
          <Check className="h-4.5 w-4.5" /> Usar esta foto
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {aoVivo ? (
          <Button variant="outline" onClick={onGaleria} disabled={contando}>
            <ImageUp className="h-4 w-4" /> Escolher da galeria
          </Button>
        ) : (
          <Button variant="outline" onClick={onTirarOutra}>
            <RotateCcw className="h-4 w-4" /> Tirar outra
          </Button>
        )}
        <Button variant="ghost" onClick={onVoltar} disabled={contando}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    </div>
  );
}

function AcoesMobile({
  aoVivo,
  contando,
  ocupado,
  capturaDesabilitada,
  onCapturar,
  onGaleria,
  onVoltar,
  onUsarFoto,
  onTirarOutra,
}: AcoesCapturaProps) {
  return (
    <div className="shell:hidden grid grid-cols-3 items-center pt-1">
      {aoVivo ? (
        <AcaoSecundaria Icon={ImageUp} label="Galeria" onClick={onGaleria} disabled={contando} />
      ) : (
        <AcaoSecundaria Icon={RotateCcw} label="Tirar outra" onClick={onTirarOutra} />
      )}
      <div className="flex justify-center">
        {aoVivo ? (
          <button
            type="button"
            onClick={onCapturar}
            disabled={capturaDesabilitada}
            aria-label="Capturar foto"
            className="border-primary/25 flex h-18 w-18 items-center justify-center rounded-full border-4 bg-white shadow-md disabled:opacity-50"
          >
            <span className="bg-primary flex h-13 w-13 items-center justify-center rounded-full text-white">
              <Camera className="h-6 w-6" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onUsarFoto}
            disabled={ocupado}
            aria-label="Usar esta foto"
            className="flex h-18 w-18 items-center justify-center rounded-full bg-[image:var(--gradient-green)] text-white shadow-md disabled:opacity-50"
          >
            <Check className="h-8 w-8" />
          </button>
        )}
      </div>
      <AcaoSecundaria Icon={ChevronLeft} label="Voltar" onClick={onVoltar} disabled={contando} />
    </div>
  );
}

function AcaoSecundaria({
  Icon,
  label,
  onClick,
  disabled,
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-primary font-heading flex flex-col items-center gap-1 text-xs font-semibold disabled:opacity-40"
    >
      <span className="bg-secondary flex h-11 w-11 items-center justify-center rounded-full">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
