"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { PasswordField } from "@/components/auth-fields";
import { Alert } from "@/components/alert";
import { EscolhaConsentimento } from "@/components/escolha-consentimento";
import { Button } from "@/components/ui/button";
import { ConsentimentoObrigatorioError, useConfirmarIdentidade } from "@/hooks/use-auth";
import { useTermosConsentimento } from "@/hooks/use-consentimentos";
import { useIdentityLink } from "@/hooks/use-identity-link";
import { ApiError } from "@/lib/api-client";
import { identityPasswordSchema, type IdentityPurpose } from "@/types/auth";
import type { DecisaoConsentimento, Finalidade } from "@/types/consentimento";

export function IdentityLinkEntry({
  purpose,
  children,
}: {
  purpose?: IdentityPurpose;
  children?: ReactNode;
}) {
  const link = useIdentityLink(purpose);
  if (!link.purpose) return children;
  return <IdentityPasswordForm purpose={link.purpose} link={link} />;
}

function IdentityPasswordForm({
  purpose,
  link,
}: {
  purpose: IdentityPurpose;
  link: ReturnType<typeof useIdentityLink>;
}) {
  const invitation = purpose === "invitation";
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [linkRecusado, setLinkRecusado] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [precisaConsentimentos, setPrecisaConsentimentos] = useState(false);
  const [decisoes, setDecisoes] = useState<Partial<Record<Finalidade, DecisaoConsentimento>>>({});
  const action = useConfirmarIdentidade(purpose);
  const valida = identityPasswordSchema.safeParse(senha).success;
  const divergente = confirmacao.length > 0 && senha !== confirmacao;
  const semToken = link.status === "missing";
  const indisponivel = link.status === "missing" || link.status === "invalid" || linkRecusado;
  const termos = useTermosConsentimento({
    enabled:
      invitation && precisaConsentimentos && link.status === "ready" && !indisponivel && !concluido,
  });
  const listaTermos = termos.data ?? [];
  const temTermoObrigatorio = listaTermos.some(
    (termo) => termo.finalidade === "health_data" && termo.obrigatorio,
  );
  const consentimentosValidos =
    termos.isSuccess &&
    !termos.isFetching &&
    temTermoObrigatorio &&
    listaTermos.every((termo) => {
      const decisao = decisoes[termo.finalidade];
      return !termo.obrigatorio || (decisao?.versao === termo.versao && decisao.aceito);
    });

  useEffect(() => {
    function clearPasswords() {
      setSenha("");
      setConfirmacao("");
      setDecisoes({});
      setAttempt((value) => value + 1);
    }
    window.addEventListener("pagehide", clearPasswords);
    return () => window.removeEventListener("pagehide", clearPasswords);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (action.isPending || concluido) return;
    setErro("");
    const token = link.getToken();
    if (!token || indisponivel) {
      setLinkRecusado(true);
      return;
    }
    if (!valida || senha !== confirmacao) {
      setErro("Confira os requisitos da senha e a confirmação.");
      return;
    }
    if (precisaConsentimentos && !consentimentosValidos) {
      setErro("Leia os termos e aceite os consentimentos obrigatórios para continuar.");
      return;
    }
    const novaSenha = senha;
    setAttempt((value) => value + 1);
    setSenha("");
    setConfirmacao("");
    try {
      await action.confirmar({
        token,
        senha: novaSenha,
        ...(precisaConsentimentos
          ? {
              consentimentos: listaTermos.flatMap((termo) => {
                const decisao = decisoes[termo.finalidade];
                return decisao?.versao === termo.versao ? [decisao] : [];
              }),
            }
          : {}),
      });
      link.clearToken();
      setDecisoes({});
      setConcluido(true);
    } catch (error) {
      if (error instanceof ConsentimentoObrigatorioError) {
        setPrecisaConsentimentos(true);
        return;
      }
      setErro(error instanceof Error ? error.message : "Não foi possível concluir a solicitação.");
      if (invitation && error instanceof ApiError && error.status === 409) {
        setPrecisaConsentimentos(true);
        setDecisoes({});
        void termos.refetch();
      }
      if (error instanceof ApiError && error.status === 400) {
        link.clearToken();
        setLinkRecusado(true);
      }
    }
  }

  const Icon = invitation ? UserRound : LockKeyhole;
  return (
    <AuthCard variant="identity">
      <div className="bg-secondary text-primary mb-4 flex size-11 items-center justify-center rounded-md">
        <Icon aria-hidden className="size-5" />
      </div>
      <span className="bg-secondary text-primary font-heading mb-2 inline-block rounded-full px-2 py-1 text-xs font-bold">
        {invitation ? "PRIMEIRO ACESSO" : "REDEFINIÇÃO DE SENHA"}
      </span>
      <h1 className="mb-1 text-xl font-extrabold">
        {semToken && !concluido
          ? invitation
            ? "Acesse seu convite"
            : "Link de recuperação necessário"
          : invitation
            ? "Boas-vindas ao CYB"
            : "Crie uma nova senha"}
      </h1>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        {semToken && !concluido
          ? invitation
            ? "Para ativar sua conta, utilize o link de convite enviado ao seu e-mail."
            : "Para criar uma nova senha, acesse o link enviado ao seu e-mail."
          : invitation
            ? "Para ativar sua conta, crie uma senha segura."
            : "Escolha uma senha diferente das anteriores para proteger sua conta."}
      </p>
      {concluido ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="success"
            message={
              invitation
                ? "Conta ativada com sucesso! Entre com sua nova senha."
                : "Senha redefinida com sucesso! Entre com sua nova senha."
            }
          />
          <Button asChild size="lg">
            <Link href="/login" replace>
              Ir para o login
            </Link>
          </Button>
        </div>
      ) : semToken ? (
        <div className="flex flex-col gap-4">
          {invitation && (
            <Alert
              type="info"
              message="Caso não tenha recebido um convite, entre em contato com o responsável pelo cadastro."
            />
          )}
          <Button asChild size="lg">
            <Link href={invitation ? "/login" : "/esqueci-senha"} replace>
              {invitation ? "Voltar ao login" : "Solicitar novo link"}
            </Link>
          </Button>
        </div>
      ) : link.status === "loading" ? (
        <p role="status" className="text-muted-foreground text-sm">
          Carregando…
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={action.isPending}
          className="flex flex-col gap-3.5"
        >
          <PasswordField
            variant="identity"
            key={`password-${attempt}`}
            label="Nova senha"
            value={senha}
            onChange={setSenha}
            autoComplete="new-password"
            required
            disabled={action.isPending || indisponivel}
            aria-describedby="password-requirements"
          />
          <PasswordField
            variant="identity"
            key={`confirmation-${attempt}`}
            label="Confirmar nova senha"
            value={confirmacao}
            onChange={setConfirmacao}
            autoComplete="new-password"
            required
            disabled={action.isPending || indisponivel}
            error={divergente ? "As senhas não coincidem." : undefined}
          />
          <div
            id="password-requirements"
            className="bg-background text-muted-foreground flex items-start gap-2 rounded-md px-3.5 py-3 text-xs leading-relaxed"
          >
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>Use no mínimo 8 caracteres, com letra maiúscula, minúscula e número.</p>
          </div>
          {precisaConsentimentos && !indisponivel && (
            <div className="flex flex-col gap-3">
              <Alert
                type="info"
                message="Para ativar sua conta, responda aos consentimentos abaixo."
              />
              {termos.isFetching && (
                <p role="status" className="text-muted-foreground text-sm">
                  Carregando termos…
                </p>
              )}
              {(termos.isError || (termos.isSuccess && !temTermoObrigatorio)) && (
                <div className="flex flex-col items-start gap-2">
                  <Alert message="Não foi possível carregar os termos necessários para ativar sua conta." />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => termos.refetch()}
                  >
                    Tentar de novo
                  </Button>
                </div>
              )}
              {termos.data?.map((termo) => (
                <EscolhaConsentimento
                  key={termo.finalidade}
                  termo={termo}
                  aceito={
                    decisoes[termo.finalidade]?.versao === termo.versao
                      ? (decisoes[termo.finalidade]?.aceito ?? null)
                      : null
                  }
                  onEscolher={(aceito) =>
                    setDecisoes((anteriores) => ({
                      ...anteriores,
                      [termo.finalidade]: {
                        finalidade: termo.finalidade,
                        versao: termo.versao,
                        aceito,
                      },
                    }))
                  }
                  desabilitado={action.isPending || termos.isFetching || termos.isError}
                />
              ))}
            </div>
          )}
          {indisponivel && !erro && (
            <Alert message="Este link é inválido ou não está mais disponível. Solicite um novo link." />
          )}
          {erro && <Alert message={erro} />}
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-md"
            disabled={
              link.status !== "ready" ||
              linkRecusado ||
              !valida ||
              senha !== confirmacao ||
              action.isPending ||
              (precisaConsentimentos && !consentimentosValidos)
            }
          >
            {action.isPending
              ? "Salvando…"
              : invitation
                ? "Ativar minha conta"
                : "Salvar nova senha"}
          </Button>
          {(indisponivel || erro) && (
            <Link
              href={invitation ? "/login" : "/esqueci-senha"}
              replace
              className="text-primary text-center text-sm font-semibold"
            >
              {invitation ? "Voltar ao login" : "Solicitar novo link"}
            </Link>
          )}
        </form>
      )}
    </AuthCard>
  );
}
