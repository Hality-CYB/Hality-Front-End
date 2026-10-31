import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DiagnosticoDetalhe } from "@/components/diagnostico-detalhe";
import type { Diagnostico } from "@/types/diagnostico";

afterEach(cleanup);

const base: Diagnostico = {
  id: "101",
  pacienteId: "paciente-1",
  nivel: 1,
  status: "aguardando_revisao",
  imagemUrl: "",
  anamneseId: "201",
  confiancaIA: 20,
  criadoEm: "2026-08-12T12:00:00Z",
};

function renderizar(diagnostico: Diagnostico) {
  render(
    <DiagnosticoDetalhe
      diagnostico={diagnostico}
      titulo="Diagnóstico #101"
      subtitulo="12/08/2026"
      status={{ label: "Aguardando revisão", tipo: "pending" }}
    />,
  );
}

it("mostra o valor da IA como escala de halitose, não como confiança", () => {
  renderizar(base);
  expect(screen.getByText("Escala de halitose: 20%")).toBeInTheDocument();
  expect(screen.queryByText(/confiança/i)).not.toBeInTheDocument();
});

it("no selo da IA após a revisão, o número segue rotulado como escala de halitose", () => {
  renderizar({
    ...base,
    status: "concluido",
    revisao: {
      revisado: true,
      profissionalNome: "Dra. Ana",
      revisadoEm: "2026-08-13T12:00:00Z",
      observacoes: null,
      nivel: 3,
      nivelCorrigido: true,
    },
  });
  expect(screen.getByText("escala de halitose 20%")).toBeInTheDocument();
  expect(screen.queryByText(/confiança/i)).not.toBeInTheDocument();
});
