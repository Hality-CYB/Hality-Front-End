"use client";

import { AvaliacaoWizard } from "@/components/avaliacao-wizard";
import { useSessaoAtual } from "@/lib/auth/session-context";

export default function AvaliacaoPage() {
  const { id: pacienteId } = useSessaoAtual();
  return <AvaliacaoWizard pacienteId={pacienteId} voltarHref="/paciente" />;
}
