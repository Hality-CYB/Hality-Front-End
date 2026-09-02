"use client";

import { useSearchParams } from "next/navigation";
import { AvaliacaoWizard } from "@/components/avaliacao-wizard";

/**
 * Espera `?paciente=<id>` (setado por quem navega pra cá — Design/'s
 * EvaluatePatient tinha um passo próprio de "selecionar paciente" antes
 * disso; simplificado aqui assumindo que o paciente já foi escolhido em
 * PatientsList/PatientDetail).
 */
export function AvaliacaoContent() {
  const searchParams = useSearchParams();
  const pacienteId = searchParams.get("paciente") ?? "paciente-1";

  return <AvaliacaoWizard pacienteId={pacienteId} voltarHref="/profissional" />;
}
