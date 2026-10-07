"use client";

import { useDeferredValue, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { ApiError } from "@/lib/api-client";
import { usePacientes, useCriarPaciente } from "@/hooks/use-pacientes";

type SelecionarPacienteProps = {
  onSelecionar: (pacienteId: string) => void;
  onCancelar: () => void;
};

function mensagemDoCadastro(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 409) {
    return "Já existe uma conta com este e-mail. Use outro e-mail ou busque o paciente na lista.";
  }
  if (erro instanceof ApiError && erro.status === 422) {
    return "Confira os dados: nome com pelo menos 2 letras e um e-mail válido.";
  }
  return "Não foi possível cadastrar o paciente. Tente novamente.";
}

/**
 * Passo 0 do "Avaliar paciente": escolher um paciente vinculado ou fazer um
 * cadastro simples (nome, e-mail e telefone), que já sai vinculado ao
 * profissional. O paciente completa o cadastro depois.
 */
export function SelecionarPaciente({ onSelecionar, onCancelar }: SelecionarPacienteProps) {
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [cadastrandoNovo, setCadastrandoNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const { data: pacientes, isLoading } = usePacientes({ busca: buscaAdiada, limite: 20 });
  const criarPaciente = useCriarPaciente();
  const novoPacienteValido = nome.trim().length >= 2 && email.trim().includes("@");

  function cadastrarEContinuar() {
    criarPaciente.mutate(
      { nome: nome.trim(), email: email.trim(), telefone: telefone.trim() || undefined },
      { onSuccess: (paciente) => onSelecionar(paciente.pacienteId) },
    );
  }

  if (cadastrandoNovo) {
    return (
      <div className="shell:mx-auto shell:w-full shell:max-w-135 flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              criarPaciente.reset();
              setCadastrandoNovo(false);
            }}
            className="text-primary flex p-1"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-lg">Novo paciente</h2>
            <p className="text-muted-foreground text-[13px]">
              Cadastro simples para começar a avaliação agora
            </p>
          </div>
        </div>
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <label
            htmlFor="nome-paciente"
            className="font-heading mb-1.5 block text-[13px] font-bold"
          >
            Nome completo *
          </label>
          <input
            id="nome-paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do paciente"
            className="border-border mb-3.5 w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          <label
            htmlFor="email-paciente"
            className="font-heading mb-1.5 block text-[13px] font-bold"
          >
            E-mail *
          </label>
          <input
            id="email-paciente"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="paciente@email.com"
            className="border-border mb-3.5 w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          <label
            htmlFor="telefone-paciente"
            className="font-heading mb-1.5 block text-[13px] font-bold"
          >
            Telefone
          </label>
          <input
            id="telefone-paciente"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            type="tel"
            placeholder="(11) 99999-9999"
            className="border-border w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          {criarPaciente.isError && (
            <p className="text-destructive mt-2.5 text-[13px]">
              {mensagemDoCadastro(criarPaciente.error)}
            </p>
          )}
        </Card>
        <div className="bg-secondary flex items-start gap-2 rounded-[10px] px-3.5 py-2.5">
          <Info className="text-primary mt-0.5 h-3.75 w-3.75 shrink-0" />
          <span className="text-muted-foreground text-xs leading-relaxed">
            O paciente já sai vinculado a você, com uma senha provisória que ele deve trocar no
            primeiro acesso.
          </span>
        </div>
        <Button
          size="lg"
          disabled={!novoPacienteValido || criarPaciente.isPending}
          onClick={cadastrarEContinuar}
        >
          {criarPaciente.isPending ? "Cadastrando…" : "Cadastrar e continuar"}
        </Button>
      </div>
    );
  }

  const lista = pacientes?.itens ?? [];

  return (
    <div className="shell:mx-auto shell:w-full shell:max-w-135 flex flex-col gap-3.5">
      <div>
        <h2 className="mb-1 text-lg">Selecionar paciente</h2>
        <p className="text-muted-foreground text-[13px]">Quem você vai avaliar agora?</p>
      </div>
      <div className="relative">
        <Search className="text-gray-3 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="border-border w-full rounded-xl border-[1.5px] bg-white py-3 pr-3.5 pl-10 text-sm outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => setCadastrandoNovo(true)}
        className="border-primary bg-secondary flex items-center gap-2.5 rounded-xl border-[1.5px] border-dashed p-3.5"
      >
        <div className="text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white">
          <Plus className="h-4 w-4" />
        </div>
        <span className="font-heading text-primary text-sm font-bold">Cadastrar novo paciente</span>
      </button>
      <div className="flex flex-col gap-2">
        {!isLoading && lista.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-sm">
            {busca ? "Nenhum paciente encontrado." : "Você ainda não tem pacientes."}
          </p>
        )}
        {lista.map((p) => (
          <Card
            key={p.id}
            onClick={() => onSelecionar(p.id)}
            className="cursor-pointer flex-row items-center gap-3 rounded-lg p-4 shadow-sm ring-0"
          >
            <AvatarWithRole nome={p.nome} size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-heading truncate text-sm font-bold">{p.nome}</div>
              <div className="text-muted-foreground text-xs">
                {p.totalDiagnosticos} diagnósticos
              </div>
            </div>
            <ChevronRight className="text-gray-3 h-4 w-4" />
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={onCancelar}>
        Cancelar
      </Button>
    </div>
  );
}
