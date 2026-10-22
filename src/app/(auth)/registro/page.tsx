"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/alert";
import { Field, PasswordField } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";
import {
  CaixaDeConsentimento,
  CaixaTermosDeUso,
  useLeituraDeTermos,
} from "@/components/caixas-de-termos";
import { RequisitosSenha } from "@/components/requisitos-senha";
import { useRegistrar, useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { useTermosConsentimento } from "@/hooks/use-consentimentos";
import { ApiError } from "@/lib/api-client";
import { problemaDaSenha } from "@/lib/senha";
import type { Finalidade } from "@/types/consentimento";

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
  const leitura = useLeituraDeTermos();
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

    const problemaSenha = problemaDaSenha(senha);
    if (problemaSenha) {
      setErro(problemaSenha);
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
          aria-describedby="requisitos-senha"
        />
        <RequisitosSenha id="requisitos-senha" senha={senha} />
        <PasswordField
          label="Confirmar senha *"
          value={senha2}
          onChange={setSenha2}
          autoComplete="new-password"
        />
        <div className="mt-0.5 flex flex-col gap-3">
          <CaixaTermosDeUso
            marcada={aceitaTermos}
            onMudar={setAceitaTermos}
            onLer={leitura.abrir}
          />
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
            <CaixaDeConsentimento
              key={termo.finalidade}
              termo={termo}
              marcada={decisoes[termo.finalidade] === true}
              onMudar={(aceito) => setDecisoes((d) => ({ ...d, [termo.finalidade]: aceito }))}
              onLer={leitura.abrir}
            />
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
      {leitura.dialogo}
    </AuthCard>
  );
}
