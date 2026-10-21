"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { Field, PasswordField } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import {
  DocumentoLegalConteudo,
  TermoConsentimentoConteudo,
  TextoLegalDialog,
} from "@/components/texto-legal-dialog";
import { useRegistrar, useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { useTermosConsentimento } from "@/hooks/use-consentimentos";
import { ApiError } from "@/lib/api-client";
import { POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO } from "@/lib/documentos-legais";
import type { Finalidade, TermoConsentimento } from "@/types/consentimento";

/** Máscara BR: (11) 91234-5678 (ou (11) 1234-5678 pra fixo, 10 dígitos). */
function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Frase de aceite de cada finalidade; o nome do termo, clicável, vem depois. */
const FRASE_DE_ACEITE: Record<string, string> = {
  health_data: "Autorizo o tratamento dos meus dados de saúde para o pré-diagnóstico, conforme o",
  image_training:
    "Autorizo o uso das fotos da minha língua para treinar a inteligência artificial, conforme o",
};

type Leitura =
  { tipo: "uso" } | { tipo: "privacidade" } | { tipo: "consentimento"; termo: TermoConsentimento };

/** Link dentro do texto de um checkbox: abre o termo sem marcar a caixa. */
function LinkDoTermo({ children, onAbrir }: { children: string; onAbrir: () => void }) {
  // <span> e não <button>: o botão não quebra no meio da frase. O preventDefault
  // impede o clique de chegar ao <label> e marcar a caixa.
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        onAbrir();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onAbrir();
      }}
      className="text-primary focus-visible:ring-ring/50 rounded-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-3"
    >
      {children}
    </span>
  );
}

export default function RegistroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  // Uma caixa por finalidade (#160 do back), nenhuma vem marcada. Caixa
  // desmarcada é a recusa: no opcional ela vai como `aceito: false`.
  const [decisoes, setDecisoes] = useState<Partial<Record<Finalidade, boolean>>>({});
  const [lendo, setLendo] = useState<Leitura | null>(null);
  const [erro, setErro] = useState("");
  const registrar = useRegistrar();
  const termos = useTermosConsentimento();

  useRedirectIfAuthenticated();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro("");

    if (!nome.trim() || !email.trim() || !senha || !senha2) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValido) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (senha !== senha2) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (!aceitaTermos) {
      setErro("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    const lista = termos.data ?? [];
    if (lista.some((t) => t.obrigatorio && !decisoes[t.finalidade])) {
      setErro("Para criar a conta, aceite o tratamento dos seus dados de saúde.");
      return;
    }

    registrar.mutate(
      {
        nome: nome.trim(),
        email: email.trim(),
        senha,
        telefone: telefone.trim() || undefined,
        consentimentos: lista.map((t) => ({
          finalidade: t.finalidade,
          versao: t.versao,
          aceito: decisoes[t.finalidade] === true,
        })),
      },
      {
        onError: (e) => {
          // Termo mudou de versão: busca a nova e pede a decisão de novo.
          if (e instanceof ApiError && e.status === 409) {
            setDecisoes({});
            termos.refetch();
          }
        },
      },
    );
  }

  return (
    <AuthCard>
      <h2 className="font-heading mb-1 text-[22px] font-black">Criar conta</h2>
      <p className="text-muted-foreground mb-6 text-sm">Preencha seus dados para começar</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field
          label="Nome completo *"
          value={nome}
          onChange={setNome}
          placeholder="Seu nome completo"
          autoComplete="name"
        />
        <Field
          label="E-mail *"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
        />
        <Field
          label="Telefone"
          value={telefone}
          onChange={(v) => setTelefone(formatarTelefone(v))}
          type="tel"
          placeholder="(11) 99999-9999"
          autoComplete="tel"
        />
        <PasswordField
          label="Senha *"
          value={senha}
          onChange={setSenha}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmar senha *"
          value={senha2}
          onChange={setSenha2}
          autoComplete="new-password"
        />
        <div className="mt-0.5 flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
              className="accent-primary mt-0.75 h-4 w-4 shrink-0"
            />
            <span className="text-muted-foreground text-[13px] leading-normal">
              Li e aceito os{" "}
              <LinkDoTermo onAbrir={() => setLendo({ tipo: "uso" })}>Termos de Uso</LinkDoTermo> e a{" "}
              <LinkDoTermo onAbrir={() => setLendo({ tipo: "privacidade" })}>
                Política de Privacidade
              </LinkDoTermo>
            </span>
          </label>
          {termos.isPending && (
            <p className="text-muted-foreground text-[13px]" role="status">
              Carregando termos…
            </p>
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
            <label key={termo.finalidade} className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={decisoes[termo.finalidade] === true}
                onChange={(e) =>
                  setDecisoes((d) => ({ ...d, [termo.finalidade]: e.target.checked }))
                }
                className="accent-primary mt-0.75 h-4 w-4 shrink-0"
              />
              <span className="text-muted-foreground text-[13px] leading-normal">
                {FRASE_DE_ACEITE[termo.finalidade] ?? "Aceito o"}{" "}
                <LinkDoTermo onAbrir={() => setLendo({ tipo: "consentimento", termo })}>
                  {`termo de ${termo.titulo.toLowerCase()}`}
                </LinkDoTermo>
                {termo.obrigatorio ? "" : " (opcional)"}
              </span>
            </label>
          ))}
        </div>
        {(erro || registrar.isError) && (
          <Alert
            message={
              erro ||
              (registrar.error instanceof Error
                ? registrar.error.message
                : "Não foi possível criar a conta.")
            }
          />
        )}
        <Button type="submit" size="lg" disabled={registrar.isPending || !termos.data}>
          {registrar.isPending ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2.5">
        <Link href="/" className="text-muted-foreground text-sm">
          ← Página inicial
        </Link>
        <p className="text-muted-foreground text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="font-heading text-primary font-bold">
            Entrar
          </Link>
        </p>
      </div>
      <TextoLegalDialog
        open={lendo !== null}
        onOpenChange={(aberto) => !aberto && setLendo(null)}
        titulo={
          lendo?.tipo === "uso"
            ? TERMOS_DE_USO.titulo
            : lendo?.tipo === "privacidade"
              ? POLITICA_DE_PRIVACIDADE.titulo
              : (lendo?.termo.titulo ?? "")
        }
        subtitulo={
          lendo?.tipo === "consentimento"
            ? `Versão ${lendo.termo.versao.replace(/^v/, "")}${lendo.termo.obrigatorio ? "" : ", opcional"}`
            : `Última atualização: ${
                (lendo?.tipo === "privacidade" ? POLITICA_DE_PRIVACIDADE : TERMOS_DE_USO)
                  .atualizadoEm
              }`
        }
      >
        {lendo?.tipo === "uso" && <DocumentoLegalConteudo documento={TERMOS_DE_USO} />}
        {lendo?.tipo === "privacidade" && (
          <DocumentoLegalConteudo documento={POLITICA_DE_PRIVACIDADE} />
        )}
        {lendo?.tipo === "consentimento" && (
          <TermoConsentimentoConteudo texto={lendo.termo.texto} />
        )}
      </TextoLegalDialog>
    </AuthCard>
  );
}
