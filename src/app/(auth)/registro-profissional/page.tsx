"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Field } from "@/components/auth-fields";
import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { CaixaTermosDeUso, useLeituraDeTermos } from "@/components/caixas-de-termos";
import { useSolicitarCadastroProfissional } from "@/hooks/use-solicitacoes-profissionais";
import { useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

export default function RegistroProfissionalPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [registro, setRegistro] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState("");
  const leitura = useLeituraDeTermos();
  const solicitar = useSolicitarCadastroProfissional();
  useRedirectIfAuthenticated();

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (solicitar.isPending) return;
    setErro("");
    if ([nome, registro, especialidade].some((valor) => valor.trim().length < 2)) {
      setErro(
        "Preencha nome, registro profissional e especialidade com pelo menos dois caracteres.",
      );
      return;
    }
    if (!aceitaTermos) {
      setErro("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    solicitar.mutate({
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim() || undefined,
      registro_profissional: registro.trim(),
      especialidade: especialidade.trim(),
      aceita_termos: true,
    });
  }

  if (solicitar.isSuccess)
    return (
      <AuthCard>
        <CheckCircle2 className="text-primary mx-auto mb-4 h-12 w-12" aria-hidden />
        <h2 className="font-heading mb-3 text-center text-[22px] font-black">
          Solicitação enviada
        </h2>
        <p className="text-muted-foreground mb-4 text-center text-sm leading-relaxed" role="status">
          A equipe Hality vai verificar seus dados. O acesso será liberado somente após aprovação de
          um administrador. A decisão será enviada para{" "}
          <strong className="break-all">{solicitar.variables.email}</strong>, inclusive se a
          solicitação não for aprovada.
        </p>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          Se aprovado, você receberá um convite para confirmar seu e-mail e definir sua senha.
          Confira também a caixa de spam.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </AuthCard>
    );

  const mensagem =
    solicitar.error instanceof ApiError && solicitar.error.status === 409
      ? "Este e-mail já possui uma conta ou solicitação. Se já é paciente, entre em contato com a equipe Hality."
      : solicitar.error instanceof ApiError && solicitar.error.status === 429
        ? "Muitas solicitações. Aguarde antes de tentar novamente."
        : solicitar.error instanceof ApiError && solicitar.error.status === 422
          ? "Confira o nome, o e-mail, o telefone e os dados profissionais informados."
          : "Não foi possível enviar sua solicitação. Confira sua conexão e tente novamente.";

  return (
    <AuthCard>
      <h2 className="font-heading mb-1 text-[22px] font-black">Cadastro profissional</h2>
      <p className="text-muted-foreground mb-5 text-sm">
        Solicite acesso para acompanhar seus pacientes.
      </p>
      <div className="bg-primary/5 text-foreground mb-5 flex gap-3 rounded-lg p-4 text-sm leading-relaxed">
        <ClipboardCheck className="text-primary h-5 w-5 shrink-0" aria-hidden />
        <p>
          Seu cadastro passará pela verificação de um administrador da Hality. Você receberá a
          aprovação ou recusa por e-mail. Após a aprovação, enviaremos um convite para definir sua
          senha e ativar a conta.
        </p>
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-3.5">
        <fieldset disabled={solicitar.isPending} className="flex flex-col gap-3.5">
          <Field
            label="Nome completo *"
            value={nome}
            onChange={setNome}
            required
            minLength={2}
            maxLength={255}
            autoComplete="name"
          />
          <Field
            label="E-mail *"
            value={email}
            onChange={setEmail}
            required
            type="email"
            maxLength={320}
            autoComplete="email"
          />
          <Field
            label="Telefone"
            value={telefone}
            onChange={setTelefone}
            type="tel"
            maxLength={20}
            autoComplete="tel"
          />
          <Field
            label="Registro profissional *"
            value={registro}
            onChange={setRegistro}
            required
            minLength={2}
            maxLength={50}
            placeholder="Ex.: CRO-RS 12345"
          />
          <Field
            label="Especialidade *"
            value={especialidade}
            onChange={setEspecialidade}
            required
            minLength={2}
            maxLength={100}
            placeholder="Sua área de atuação"
          />
          <CaixaTermosDeUso
            marcada={aceitaTermos}
            onMudar={setAceitaTermos}
            onLer={leitura.abrir}
          />
        </fieldset>
        {(erro || solicitar.isError) && <Alert message={erro || mensagem} />}
        <Button type="submit" size="lg" disabled={solicitar.isPending}>
          {solicitar.isPending ? "Enviando solicitação…" : "Solicitar acesso profissional"}
        </Button>
      </form>
      <div className="text-muted-foreground mt-5 flex flex-col items-center gap-3 text-sm">
        <p>
          Já tem conta?{" "}
          <Link href="/login" className="font-heading text-primary font-bold">
            Entrar
          </Link>
        </p>
        <Link href="/registro" className="text-primary">
          Quero me cadastrar como paciente
        </Link>
        <Link href="/">← Página inicial</Link>
      </div>
      {leitura.dialogo}
    </AuthCard>
  );
}
