"use client";

import { useDeferredValue, useState } from "react";
import { Search, Link2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarWithRole } from "@/components/avatar-with-role";
import { ApiError } from "@/lib/api-client";
import { usePacientes, useVincularPaciente } from "@/hooks/use-pacientes";

type SelecionarPacienteProps = {
  onSelecionar: (pacienteId: string) => void;
  onCancelar: () => void;
};

function mensagemDoVinculo(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 409) return "Este paciente já está vinculado a você.";
    try {
      const corpo = JSON.parse(erro.message) as { detail?: unknown };
      if (typeof corpo.detail === "string") {
        if (corpo.detail === "paciente não encontrado") {
          return "Não há paciente cadastrado com este e-mail. Peça para ele criar a conta primeiro.";
        }
        return corpo.detail;
      }
    } catch {
      // corpo não é JSON; cai na mensagem genérica
    }
  }
  return "Não foi possível vincular o paciente. Tente novamente.";
}

/**
 * Passo 0 do "Avaliar paciente": escolher um paciente vinculado ou vincular
 * um novo pelo e-mail. O profissional não cadastra paciente — o paciente
 * cria a própria conta e o profissional só se vincula a ela (PR #88 do back).
 */
export function SelecionarPaciente({ onSelecionar, onCancelar }: SelecionarPacienteProps) {
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [vinculando, setVinculando] = useState(false);
  const [email, setEmail] = useState("");

  const { data: pacientes, isLoading } = usePacientes({ busca: buscaAdiada, limite: 20 });
  const vincular = useVincularPaciente();
  const emailValido = email.trim().includes("@");

  function vincularEContinuar() {
    vincular.mutate(email.trim(), { onSuccess: (vinculo) => onSelecionar(vinculo.pacienteId) });
  }

  if (vinculando) {
    return (
      <div className="shell:mx-auto shell:w-full shell:max-w-135 flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              vincular.reset();
              setVinculando(false);
            }}
            className="text-primary flex p-1"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-lg">Vincular paciente</h2>
            <p className="text-muted-foreground text-[13px]">
              Informe o e-mail que o paciente usou no cadastro
            </p>
          </div>
        </div>
        <Card className="rounded-lg p-5 shadow-sm ring-0">
          <label
            htmlFor="email-paciente"
            className="font-heading mb-1.5 block text-[13px] font-bold"
          >
            E-mail do paciente
          </label>
          <input
            id="email-paciente"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="paciente@email.com"
            className="border-border w-full rounded-[10px] border-[1.5px] px-3.5 py-2.75 text-sm outline-none"
          />
          {vincular.isError && (
            <p className="text-destructive mt-2.5 text-[13px]">
              {mensagemDoVinculo(vincular.error)}
            </p>
          )}
        </Card>
        <div className="bg-secondary flex items-start gap-2 rounded-[10px] px-3.5 py-2.5">
          <Info className="text-primary mt-0.5 h-3.75 w-3.75 shrink-0" />
          <span className="text-muted-foreground text-xs leading-relaxed">
            O paciente precisa ter conta no Check Your Breath. Depois do vínculo, você passa a ver
            os diagnósticos dele e pode avaliá-lo.
          </span>
        </div>
        <Button
          size="lg"
          disabled={!emailValido || vincular.isPending}
          onClick={vincularEContinuar}
        >
          {vincular.isPending ? "Vinculando…" : "Vincular e continuar"}
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
        onClick={() => setVinculando(true)}
        className="border-primary bg-secondary flex items-center gap-2.5 rounded-xl border-[1.5px] border-dashed p-3.5"
      >
        <div className="text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white">
          <Link2 className="h-4 w-4" />
        </div>
        <span className="font-heading text-primary text-sm font-bold">
          Vincular paciente pelo e-mail
        </span>
      </button>
      <div className="flex flex-col gap-2">
        {!isLoading && lista.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-sm">
            {busca ? "Nenhum paciente encontrado." : "Você ainda não tem pacientes vinculados."}
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
