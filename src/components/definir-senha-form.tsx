"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Lock, UserRound } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { PasswordField } from "@/components/auth-fields";
import { Alert } from "@/components/alert";
import {
  CaixaDeConsentimento,
  CaixaTermosDeUso,
  useLeituraDeTermos,
} from "@/components/caixas-de-termos";
import { RequisitosSenha } from "@/components/requisitos-senha";
import { Button } from "@/components/ui/button";
import { ConsentimentoObrigatorioError, useDefinirSenhaPeloLink } from "@/hooks/use-auth";
import { useTermosConsentimento } from "@/hooks/use-consentimentos";
import { useLinkDeAcesso } from "@/hooks/use-link-de-acesso";
import { ApiError } from "@/lib/api-client";
import { problemaDaSenha } from "@/lib/senha";
import { ConfirmarEmailPorLink } from "@/components/confirmar-email-por-link";
import type { FinalidadeDeSenha, FinalidadeDoLink } from "@/types/auth";
import type { Finalidade } from "@/types/consentimento";

/**
 * Entrada pelo link do e-mail (convite ou recuperação de senha). Sem link de
 * acesso na URL, mostra `children` (na raiz, a landing).
 */
export function EntradaPorLink({
  finalidade,
  children,
}: {
  finalidade?: FinalidadeDoLink;
  children?: ReactNode;
}) {
  const link = useLinkDeAcesso(finalidade);
  if (!link.finalidade) return children;
  if (link.finalidade === "confirmacao_email") return <ConfirmarEmailPorLink link={link} />;
  return <DefinirSenhaForm finalidade={link.finalidade} link={link} />;
}

const TEXTOS = {
  convite: {
    Icon: UserRound,
    titulo: "Ative sua conta",
    subtitulo: "Crie uma senha para entrar no Check Your Breath.",
    semLinkTitulo: "Use o link do convite",
    semLinkSubtitulo: "Para ativar sua conta, abra o link do convite que chegou no seu e-mail.",
    concluido: "Conta ativada! Entre com o seu e-mail e a senha que você criou.",
    botao: "Ativar conta",
    voltar: { href: "/login", texto: "Voltar ao login" },
  },
  recuperacao: {
    Icon: Lock,
    titulo: "Nova senha",
    subtitulo: "Crie uma nova senha para entrar na sua conta.",
    semLinkTitulo: "Use o link do e-mail",
    semLinkSubtitulo:
      "Para criar uma nova senha, abra o link de recuperação que chegou no seu e-mail.",
    concluido: "Senha alterada! Entre com a nova senha.",
    botao: "Salvar nova senha",
    voltar: { href: "/esqueci-senha", texto: "Pedir um novo link" },
  },
} as const;

function DefinirSenhaForm({
  finalidade,
  link,
}: {
  finalidade: FinalidadeDeSenha;
  link: ReturnType<typeof useLinkDeAcesso>;
}) {
  const convite = finalidade === "convite";
  const textos = TEXTOS[finalidade];
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [linkRecusado, setLinkRecusado] = useState(false);
  const [aceitaTermosDeUso, setAceitaTermosDeUso] = useState(false);
  // O back só pede consentimento no convite de paciente; a tela descobre pela resposta.
  const [pedeConsentimentos, setPedeConsentimentos] = useState(false);
  const [decisoes, setDecisoes] = useState<Partial<Record<Finalidade, boolean>>>({});
  const leitura = useLeituraDeTermos();
  const { definir, enviando } = useDefinirSenhaPeloLink(finalidade);
  const indisponivel = link.status === "ausente" || link.status === "invalido" || linkRecusado;
  const termos = useTermosConsentimento({
    enabled: convite && pedeConsentimentos && !indisponivel && !concluido,
  });
  const listaTermos = termos.data ?? [];
  const divergente = confirmacao.length > 0 && senha !== confirmacao;

  // Ao sair da página (inclusive pelo cache de navegação), nada sensível fica na tela.
  useEffect(() => {
    function limpar() {
      setSenha("");
      setConfirmacao("");
      setDecisoes({});
    }
    window.addEventListener("pagehide", limpar);
    return () => window.removeEventListener("pagehide", limpar);
  }, []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviando || concluido) return;
    setErro("");
    const token = link.lerToken();
    if (!token || indisponivel) {
      setLinkRecusado(true);
      return;
    }
    const problema = problemaDaSenha(senha);
    if (problema) {
      setErro(problema);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (convite && !aceitaTermosDeUso) {
      setErro("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    if (pedeConsentimentos) {
      if (!termos.isSuccess) return;
      if (listaTermos.some((t) => t.obrigatorio && !decisoes[t.finalidade])) {
        setErro("Para ativar a conta, autorize o tratamento dos seus dados de saúde.");
        return;
      }
    }
    try {
      await definir({
        token,
        senha,
        ...(pedeConsentimentos
          ? {
              consentimentos: listaTermos.map((t) => ({
                finalidade: t.finalidade,
                versao: t.versao,
                aceito: decisoes[t.finalidade] === true,
              })),
            }
          : {}),
      });
      link.descartarToken();
      setSenha("");
      setConfirmacao("");
      setDecisoes({});
      setConcluido(true);
    } catch (e) {
      // Paciente: o back pede os consentimentos. A senha continua preenchida.
      if (e instanceof ConsentimentoObrigatorioError) {
        setPedeConsentimentos(true);
        return;
      }
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
      if (convite && e instanceof ApiError && e.status === 409) {
        setPedeConsentimentos(true);
        setDecisoes({});
        void termos.refetch();
      }
      if (e instanceof ApiError && e.status === 400) {
        link.descartarToken();
        setLinkRecusado(true);
      }
    }
  }

  const semLink = link.status === "ausente" && !concluido;
  const { Icon } = textos;
  return (
    <AuthCard>
      <div className="bg-secondary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]">
        <Icon aria-hidden className="h-5.5 w-5.5" />
      </div>
      <h2 className="font-heading mb-1 text-[22px] font-black">
        {semLink ? textos.semLinkTitulo : textos.titulo}
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {semLink ? textos.semLinkSubtitulo : textos.subtitulo}
      </p>

      {concluido ? (
        <div className="flex flex-col gap-3.5">
          <Alert type="success" message={textos.concluido} />
          <Button asChild size="lg">
            <Link href="/login" replace>
              Ir para o login
            </Link>
          </Button>
        </div>
      ) : semLink ? (
        <div className="flex flex-col gap-3.5">
          {convite && (
            <Alert type="info" message="Não recebeu o convite? Fale com quem fez o seu cadastro." />
          )}
          <Button asChild size="lg">
            <Link href={textos.voltar.href} replace>
              {textos.voltar.texto}
            </Link>
          </Button>
        </div>
      ) : link.status === "carregando" ? (
        <p role="status" className="text-muted-foreground text-sm">
          Carregando…
        </p>
      ) : (
        <form onSubmit={enviar} noValidate aria-busy={enviando} className="flex flex-col gap-3.5">
          <PasswordField
            label={convite ? "Senha" : "Nova senha"}
            value={senha}
            onChange={setSenha}
            autoComplete="new-password"
            required
            disabled={enviando || indisponivel}
            aria-describedby="requisitos-senha"
          />
          <RequisitosSenha id="requisitos-senha" senha={senha} />
          <PasswordField
            label={convite ? "Confirmar senha" : "Confirmar nova senha"}
            value={confirmacao}
            onChange={setConfirmacao}
            autoComplete="new-password"
            required
            disabled={enviando || indisponivel}
            error={divergente ? "As senhas não coincidem." : undefined}
          />

          {convite && !indisponivel && (
            <div className="mt-0.5 flex flex-col gap-3">
              <CaixaTermosDeUso
                marcada={aceitaTermosDeUso}
                onMudar={setAceitaTermosDeUso}
                onLer={leitura.abrir}
                desabilitada={enviando}
              />
              {pedeConsentimentos && (
                <>
                  <Alert
                    type="info"
                    message="Para ativar sua conta, autorize o uso dos seus dados abaixo."
                  />
                  {termos.isFetching && (
                    <p role="status" className="text-muted-foreground text-[13px]">
                      Carregando termos…
                    </p>
                  )}
                  {termos.isError && (
                    <div className="flex flex-col items-start gap-2">
                      <Alert message="Não foi possível carregar os termos." />
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
                  {listaTermos.map((termo) => (
                    <CaixaDeConsentimento
                      key={termo.finalidade}
                      termo={termo}
                      marcada={decisoes[termo.finalidade] === true}
                      onMudar={(aceito) =>
                        setDecisoes((d) => ({ ...d, [termo.finalidade]: aceito }))
                      }
                      onLer={leitura.abrir}
                      desabilitada={enviando || termos.isFetching}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {indisponivel && !erro && (
            <Alert message="Este link não vale mais. Peça um novo para continuar." />
          )}
          {erro && <Alert message={erro} />}
          <Button
            type="submit"
            size="lg"
            disabled={
              link.status !== "pronto" ||
              linkRecusado ||
              enviando ||
              (pedeConsentimentos && !termos.isSuccess)
            }
          >
            {enviando ? "Salvando…" : textos.botao}
          </Button>
          {(indisponivel || erro) && (
            <Link
              href={textos.voltar.href}
              replace
              className="text-primary text-center text-sm font-semibold"
            >
              {textos.voltar.texto}
            </Link>
          )}
        </form>
      )}
      {leitura.dialogo}
    </AuthCard>
  );
}
