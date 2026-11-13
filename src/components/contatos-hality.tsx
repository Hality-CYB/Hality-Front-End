import { Mail, MessageCircle } from "lucide-react";
import { CONTATOS_HALITY, linkEmail, linkWhatsApp, type RedeHality } from "@/lib/contatos-hality";
import { cn } from "@/lib/utils";

/** O lucide 1.x não tem mais ícones de marca; estes são desenhos simples, só de contorno. */
export function IconeRede({ rede, className }: { rede: RedeHality; className?: string }) {
  const comum = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  if (rede === "instagram") {
    return (
      <svg {...comum}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (rede === "facebook") {
    return (
      <svg {...comum}>
        <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

type ContatosHalityProps = {
  /** `claro` para fundo escuro (landing, card da avaliação); `padrao` para fundo branco. */
  tom?: "claro" | "padrao";
  /** Mensagem já escrita no WhatsApp. */
  mensagemWhatsApp?: string;
  assuntoEmail?: string;
  mostrarRedes?: boolean;
  className?: string;
};

/** WhatsApp, e-mail e redes da Hality, todos clicáveis. */
export function ContatosHality({
  tom = "padrao",
  mensagemWhatsApp,
  assuntoEmail,
  mostrarRedes = true,
  className,
}: ContatosHalityProps) {
  const claro = tom === "claro";
  const linha = cn(
    "font-heading flex items-center gap-2 text-xs font-semibold underline-offset-2 hover:underline",
    claro ? "text-white/80 hover:text-white" : "text-primary",
  );
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <a href={linkWhatsApp(mensagemWhatsApp)} target="_blank" rel="noreferrer" className={linha}>
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        WhatsApp {CONTATOS_HALITY.whatsapp.exibicao}
      </a>
      <a href={linkEmail(assuntoEmail)} className={linha}>
        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {CONTATOS_HALITY.email}
      </a>
      {mostrarRedes && <RedesHality tom={tom} className="mt-1" />}
    </div>
  );
}

export function RedesHality({
  tom = "padrao",
  className,
}: {
  tom?: "claro" | "padrao";
  className?: string;
}) {
  const claro = tom === "claro";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {CONTATOS_HALITY.redes.map(({ rede, nome, url }) => (
        <a
          key={rede}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Hality no ${nome}`}
          title={nome}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            claro
              ? "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              : "bg-secondary text-primary hover:bg-secondary/70",
          )}
        >
          <IconeRede rede={rede} className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
