"use client";

import { useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { useSessaoAtual } from "@/lib/auth/session-context";
import { usePacientes, useCriarPaciente } from "@/hooks/use-pacientes";

type SelecionarPacienteProps = {
  onSelecionar: (pacienteId: string) => void;
  onCancelar: () => void;
};

/**
 * Porta Design/'s EvaluatePatient — passo 0 (selecionar paciente) e 0b
 * (cadastrar novo paciente), que tinham sido perdidos na primeira leva do
 * port do fluxo de avaliação do profissional (que assumia o paciente já
 * escolhido). Cadastro básico só com nome/e-mail/telefone — o aviso de que
 * o paciente recebe e-mail com senha depois é texto informativo mesmo em
 * Design/, não está implementado nem lá.
 */
export function SelecionarPaciente({ onSelecionar, onCancelar }: SelecionarPacienteProps) {
  const { id: profissionalId } = useSessaoAtual();
  const [busca, setBusca] = useState("");
  const [cadastrandoNovo, setCadastrandoNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const { data: pacientes } = usePacientes({ profissionalId });
  const criarPaciente = useCriarPaciente();

  const filtrados = (pacientes ?? []).filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()),
  );
  const novoPacienteValido = nome.trim().length > 0 && email.trim().includes("@");

  async function cadastrarEContinuar() {
    const criado = await criarPaciente.mutateAsync({
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim() || undefined,
      profissionalVinculadoId: profissionalId,
    });
    onSelecionar(criado.id);
  }

  if (cadastrandoNovo) {
    return (
      <div className="shell:mx-auto shell:w-full shell:max-w-135 flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setCadastrandoNovo(false)} className="text-primary flex p-1">
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-lg">Novo paciente</h2>
            <p className="text-muted-foreground text-[13px]">
              Cadastro simples pra começar a avaliação agora
            </p>
          </div>
        </div>
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <label className="font-heading mb-1.5 block text-[13px] font-bold">Nome completo *</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do paciente"
            className="border-border mb-3.5 w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          <label className="font-heading mb-1.5 block text-[13px] font-bold">E-mail *</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="paciente@email.com"
            className="border-border mb-3.5 w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          <label className="font-heading mb-1.5 block text-[13px] font-bold">Telefone</label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="border-border w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
        </Card>
        <div className="bg-secondary flex items-start gap-2 rounded-[10px] px-3.5 py-2.5">
          <Info className="text-primary mt-0.5 h-3.75 w-3.75 shrink-0" />
          <span className="text-muted-foreground text-xs leading-relaxed">
            O paciente vai receber um e-mail com um link pra completar o cadastro dele (senha,
            telefone etc.) depois — por enquanto isso ainda não está implementado, é só o cadastro
            básico pra liberar a avaliação.
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
          placeholder="Buscar paciente..."
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
        {filtrados.map((p) => (
          <Card
            key={p.id}
            onClick={() => onSelecionar(p.id)}
            className="cursor-pointer flex-row items-center gap-3 rounded-lg p-4 shadow-sm ring-0"
          >
            <AvatarWithRole nome={p.nome} size={40} />
            <div className="flex-1">
              <div className="font-heading text-sm font-bold">{p.nome}</div>
              <div className="text-muted-foreground text-xs">
                {p.totalDiagnosticos} diagnósticos
              </div>
            </div>
            {!p.consentimentoDadosSaude.aceito && (
              <StatusBadge label="Cadastro pendente" status="pending" />
            )}
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
