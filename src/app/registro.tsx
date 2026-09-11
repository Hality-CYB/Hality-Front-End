"use client";

import { useState } from "react";
import { Alert } from "@/components/alert";
import { AuthCard } from "@/components/auth-card";
import { Field, PasswordField } from "@/components/auth-fields";
import { useRegistrar } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmacaoSenha: string;
  profissionalIndicador: string;
  consentimentoDados: boolean;
  consentimentoComunicacoes: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  confirmacaoSenha: "",
  profissionalIndicador: "",
  consentimentoDados: false,
  consentimentoComunicacoes: false,
};

function validar(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const telefoneValido = /^(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}$/.test(
    form.telefone,
  );
  const senhaValida =
    form.senha.length >= 8 &&
    /[A-Z]/.test(form.senha) &&
    /[a-z]/.test(form.senha) &&
    /\d/.test(form.senha);

  if (!form.nome.trim()) errors.nome = "Informe seu nome completo.";
  if (!form.email.trim()) errors.email = "Informe seu e-mail.";
  else if (!emailValido) errors.email = "Digite um e-mail válido.";
  if (!form.telefone.trim()) errors.telefone = "Informe seu telefone.";
  else if (!telefoneValido) errors.telefone = "Digite um telefone válido.";
  if (!senhaValida) {
    errors.senha = "Use ao menos 8 caracteres, uma maiúscula, uma minúscula e um número.";
  }
  if (form.confirmacaoSenha !== form.senha) {
    errors.confirmacaoSenha = "As senhas não coincidem.";
  }
  if (!form.consentimentoDados) {
    errors.consentimentoDados = "Aceite o tratamento de dados para continuar.";
  }

  return errors;
}

function mensagemDeErro(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "Este e-mail já está cadastrado. Entre na sua conta ou use outro e-mail.";
  }
  return "Não foi possível concluir o cadastro agora. Tente novamente.";
}

export default function RegistroPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const registrar = useRegistrar();

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validar(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    registrar.mutate({
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      telefone: form.telefone.trim(),
      senha: form.senha,
      profissionalIndicador: form.profissionalIndicador.trim() || undefined,
      consentimentoDados: form.consentimentoDados,
      consentimentoComunicacoes: form.consentimentoComunicacoes,
    });
  }

  const podeEnviar =
    Boolean(
      form.nome.trim() &&
        form.email.trim() &&
        form.telefone.trim() &&
        form.senha &&
        form.confirmacaoSenha,
    ) && form.consentimentoDados;

  return (
    <AuthCard>
      <div className="mb-5">
        <h2 className="font-heading text-xl tracking-tight text-[var(--color-teal-900)]">
          Criar conta
        </h2>
        <p className="text-muted-foreground mt-1 text-[13px]">Preencha seus dados para começar</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {registrar.isError && <Alert message={mensagemDeErro(registrar.error)} />}

        <div>
          <Field
            label="Nome completo *"
            value={form.nome}
            onChange={(value) => updateField("nome", value)}
            placeholder="Seu nome completo"
            autoComplete="name"
          />
          {errors.nome && <p className="mt-1 text-xs text-[#C0392B]">{errors.nome}</p>}
        </div>
        <div>
          <Field
            label="E-mail *"
            value={form.email}
            onChange={(value) => updateField("email", value)}
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-[#C0392B]">{errors.email}</p>}
        </div>
        <div>
          <Field
            label="Telefone *"
            value={form.telefone}
            onChange={(value) => updateField("telefone", value)}
            type="tel"
            placeholder="(11) 99999-9999"
            autoComplete="tel"
          />
          {errors.telefone && <p className="mt-1 text-xs text-[#C0392B]">{errors.telefone}</p>}
        </div>
        <Field
          label="Profissional que indicou"
          value={form.profissionalIndicador}
          onChange={(value) => updateField("profissionalIndicador", value)}
          placeholder="Nome ou código (opcional)"
        />
        <div>
          <PasswordField
            label="Senha *"
            value={form.senha}
            onChange={(value) => updateField("senha", value)}
            autoComplete="new-password"
          />
          {errors.senha && <p className="mt-1 text-xs text-[#C0392B]">{errors.senha}</p>}
        </div>
        <div>
          <PasswordField
            label="Confirmar senha *"
            value={form.confirmacaoSenha}
            onChange={(value) => updateField("confirmacaoSenha", value)}
            autoComplete="new-password"
          />
          {errors.confirmacaoSenha && (
            <p className="mt-1 text-xs text-[#C0392B]">{errors.confirmacaoSenha}</p>
          )}
        </div>

        <div className="flex flex-col pt-1 text-xs text-muted-foreground">
          <label className="flex items-start gap-2">
            <Checkbox
              checked={form.consentimentoDados}
              onCheckedChange={(checked) => updateField("consentimentoDados", checked === true)}
              aria-invalid={Boolean(errors.consentimentoDados)}
            />
            <span>
              Li e aceito o tratamento dos meus dados conforme a{" "}
              <a
                href="#"
                className="font-semibold text-primary underline"
                onClick={(event) => event.preventDefault()}
              >
                Política de Privacidade
              </a>{" "}
              *
            </span>
          </label>
          {errors.consentimentoDados && (
            <p className="-mt-2 ml-6 text-xs text-[#C0392B]">{errors.consentimentoDados}</p>
          )}
          <label className="flex items-start gap-2">
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className=" w-full"
          disabled={!podeEnviar || registrar.isPending}
        >
          {registrar.isPending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <a
        href="/"
        className="text-muted-foreground mt-4 block text-center text-[13px] hover:underline"
      >
        ← Página inicial
      </a>

      <div className="text-muted-foreground mt-3 text-center text-[13px]">
        <span>Já tem conta? </span>
        <a href="/login" className="font-heading font-bold text-primary hover:underline">
          Entrar
        </a>
      </div>
    </AuthCard>
  );
}