"use client";

import { useEffect, useRef } from "react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { ConfirmacaoEmailPendente } from "@/components/confirmacao-email-pendente";
import { Button } from "@/components/ui/button";
import { useConfirmarEmail, LinkDeConfirmacaoInvalidoError } from "@/hooks/use-auth";
import type { useLinkDeAcesso } from "@/hooks/use-link-de-acesso";

export function ConfirmarEmailPorLink({ link }: { link: ReturnType<typeof useLinkDeAcesso> }) {
  const confirmar = useConfirmarEmail();
  const { mutate, reset } = confirmar;
  const tokenRef = useRef<string | null>(null);
  const iniciou = useRef(false);

  useEffect(() => {
    if (iniciou.current || link.status !== "pronto") return;
    iniciou.current = true;
    tokenRef.current = link.lerToken();
    link.descartarToken();
    if (tokenRef.current) mutate(tokenRef.current);
  }, [link, mutate]);

  function tentarDeNovo() {
    if (!tokenRef.current) return;
    reset();
    mutate(tokenRef.current);
  }

  const linkInvalido =
    link.status === "ausente" ||
    link.status === "invalido" ||
    confirmar.error instanceof LinkDeConfirmacaoInvalidoError;

  if (linkInvalido) {
    return (
      <AuthCard>
        <ConfirmacaoEmailPendente
          titulo="Este link não vale mais"
          descricao="O link de confirmação expirou, já foi usado ou foi substituído. Peça um novo link para confirmar seu e-mail."
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-heading text-[22px] font-black">Confirmando seu e-mail</h2>
        {confirmar.isError ? (
          <>
            <Alert message={confirmar.error.message} />
            <Button type="button" size="lg" onClick={tentarDeNovo}>
              Tentar de novo
            </Button>
          </>
        ) : (
          <p role="status" className="text-muted-foreground text-sm">
            Aguarde um instante…
          </p>
        )}
      </div>
    </AuthCard>
  );
}
