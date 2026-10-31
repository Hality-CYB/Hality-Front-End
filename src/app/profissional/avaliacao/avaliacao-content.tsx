"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AvaliacaoWizard } from "@/components/avaliacao-wizard";
import { SelecionarPaciente } from "@/components/selecionar-paciente";

/**
 * Porta Design/'s EvaluatePatient: se `?paciente=<id>` já vier setado (ex.:
 * botão "Avaliar este paciente" dentro do detalhe do paciente), pula direto
 * pro wizard de anamnese/captura — senão mostra a seleção/cadastro de
 * paciente primeiro, igual Design/.
 */
export function AvaliacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pacienteId, setPacienteId] = useState<string | null>(searchParams.get("paciente"));

  if (!pacienteId) {
    return (
      <div className="bg-background flex min-h-full flex-col p-4">
        <SelecionarPaciente
          onSelecionar={setPacienteId}
          onCancelar={() => router.push("/profissional")}
        />
      </div>
    );
  }

  return (
    <AvaliacaoWizard pacienteId={pacienteId} voltarHref="/profissional" perfil="profissional" />
  );
}
