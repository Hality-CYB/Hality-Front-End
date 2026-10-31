"use client";

import { AvaliacaoWizard } from "@/components/avaliacao-wizard";
import { useSessaoAtual } from "@/lib/auth/session-context";

export default function AvaliacaoPage() {
  const sessao = useSessaoAtual();

  return <AvaliacaoWizard pacienteId={sessao.id} voltarHref="/paciente" />;
}
