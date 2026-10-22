import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { REQUISITOS_SENHA } from "@/lib/senha";

type RequisitosSenhaProps = {
  senha: string;
  /** Para o campo de senha apontar aqui com `aria-describedby`. */
  id?: string;
  className?: string;
};

/** Lista os requisitos da senha nova e marca os que já foram cumpridos. */
export function RequisitosSenha({ senha, id, className }: RequisitosSenhaProps) {
  return (
    <ul
      id={id}
      className={cn(
        "bg-background flex flex-col gap-1 rounded-xl px-3.5 py-2.5 text-xs",
        className,
      )}
    >
      {REQUISITOS_SENHA.map((requisito) => {
        const ok = requisito.cumpre(senha);
        return (
          <li
            key={requisito.id}
            className={cn(
              "flex items-center gap-2",
              ok ? "text-green-600" : "text-muted-foreground",
            )}
          >
            {ok ? (
              <Check aria-hidden className="size-3.5" />
            ) : (
              <Circle aria-hidden className="size-3.5" />
            )}
            {requisito.texto}
            <span className="sr-only">{ok ? "(cumprido)" : "(pendente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
