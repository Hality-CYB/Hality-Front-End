"use client";

import { ErroPagina } from "@/components/estado-pagina";

/**
 * Boundary de erro das telas de paciente: um erro inesperado ao renderizar vira
 * esta mensagem (dentro do layout, com o menu) em vez de tela em branco.
 */
export default function ErroInesperado({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErroPagina
      titulo="Algo deu errado nesta tela"
      descricao="Tente de novo. Se continuar, volte para o início."
      onTentarDeNovo={reset}
      voltar={{ href: "/paciente", label: "Ir para o início" }}
    />
  );
}
