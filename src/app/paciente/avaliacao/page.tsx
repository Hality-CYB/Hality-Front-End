"use client";

import { AvaliacaoWizard } from "@/components/avaliacao-wizard";

// TODO: substituir pelo id do paciente logado (ver sessão em RoleLayout,
// que já sabe o id mas ainda não expõe pro cliente).
const PACIENTE_ID_PLACEHOLDER = "paciente-1";

export default function AvaliacaoPage() {
  return <AvaliacaoWizard pacienteId={PACIENTE_ID_PLACEHOLDER} voltarHref="/paciente" />;
}
