"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert } from "@/components/alert";
import { AuthCard } from "@/components/auth-card";
import { CaixaDeConsentimento, useLeituraDeTermos } from "@/components/caixas-de-termos";
import { Button } from "@/components/ui/button";
import { useAuthGoogle } from "@/hooks/use-auth-google";
import { useTermosConsentimento } from "@/hooks/use-consentimentos";
import { ApiError } from "@/lib/api-client";
import type { Finalidade } from "@/types/consentimento";

export function RetornoLoginGoogle() {
  const estado = useAuthGoogle();
  const termos = useTermosConsentimento({ enabled: estado.status === "consentimento" });
  const leitura = useLeituraDeTermos();
  const [decisoes, setDecisoes] = useState<Partial<Record<Finalidade, boolean>>>({});
  const [erroValidacao, setErroValidacao] = useState("");

  function handleConsentimentos(event: FormEvent) {
    event.preventDefault();
    setErroValidacao("");
    const lista = termos.data ?? [];
    if (lista.some((termo) => termo.obrigatorio && !decisoes[termo.finalidade])) {
      setErroValidacao("Para criar a conta, autorize o tratamento dos seus dados de saúde.");
      return;
    }

    void estado
      .concluirPrimeiroAcesso(
        lista.map((termo) => ({
          finalidade: termo.finalidade,
          versao: termo.versao,
          aceito: decisoes[termo.finalidade] === true,
        })),
      )
      .catch((erro: unknown) => {
        if (
          erro instanceof ApiError &&
          erro.status === 409 &&
          erro.message.startsWith("Os termos foram atualizados.")
        ) {
          setDecisoes({});
          void termos.refetch();
        }
      });
  }

  if (estado.status === "carregando" || estado.status === "sucesso") {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
          {estado.status === "sucesso" ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden />
          ) : (
            <Loader2 className="text-primary h-8 w-8 motion-safe:animate-spin" aria-hidden />
          )}
          <div>
            <h2 className="font-heading text-xl font-bold text-[var(--color-teal-900)]">
              Entrando com Google
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">{estado.mensagem}</p>
          </div>
        </div>
      </AuthCard>
    );
  }

  const precisaConsentimento = estado.status === "consentimento";
  const cancelado = estado.status === "cancelado";

  if (precisaConsentimento) {
    return (
      <AuthCard>
        <div className="mb-5 text-center">
          <h2 className="font-heading text-xl font-bold text-[var(--color-teal-900)]">
            Antes de continuar
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Confira como seus dados serão utilizados no Check Your Breath.
          </p>
        </div>

        <form onSubmit={handleConsentimentos} className="flex flex-col gap-4">
          {termos.isPending && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <Loader2 className="text-primary h-4 w-4 motion-safe:animate-spin" aria-hidden />
              Carregando termos…
            </div>
          )}

          {termos.isError && (
            <div className="flex flex-col items-start gap-2">
              <Alert message="Não foi possível carregar os termos. Sem eles não dá para criar a conta." />
              <Button type="button" size="sm" variant="secondary" onClick={() => termos.refetch()}>
                Tentar de novo
              </Button>
            </div>
          )}

          {termos.data?.map((termo) => (
            <CaixaDeConsentimento
              key={termo.finalidade}
              termo={termo}
              marcada={decisoes[termo.finalidade] === true}
              desabilitada={estado.enviando}
              onMudar={(aceito) =>
                setDecisoes((anteriores) => ({
                  ...anteriores,
                  [termo.finalidade]: aceito,
                }))
              }
              onLer={leitura.abrir}
            />
          ))}

          {(erroValidacao || estado.erro) && (
            <Alert message={erroValidacao || estado.erro || "Não foi possível criar a conta."} />
          )}

          <Button type="submit" size="lg" disabled={estado.enviando || !termos.data}>
            {estado.enviando ? "Criando conta…" : "Aceitar e continuar"}
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">Voltar ao login</Link>
          </Button>
        </form>
        {leitura.dialogo}
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold text-[var(--color-teal-900)]">
            {cancelado ? "Login cancelado" : "Não foi possível entrar"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Você pode voltar ao login e tentar novamente.
          </p>
        </div>

        <Alert type={cancelado ? "info" : "error"} message={estado.mensagem} />

        <Button variant="secondary" className="w-full" asChild>
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
