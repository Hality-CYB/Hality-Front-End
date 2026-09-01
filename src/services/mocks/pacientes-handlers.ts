import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { seedPacientes, seedDiagnosticos } from "@/services/mocks/seed-data";

const pacientes = [...seedPacientes];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Resumo usado nas listas de paciente (diagnósticos + último resultado). */
function comResumo(paciente: (typeof pacientes)[number]) {
  const diags = seedDiagnosticos.filter((d) => d.pacienteId === paciente.id);
  const ultimo = diags.at(-1);
  return {
    ...paciente,
    totalDiagnosticos: diags.length,
    ultimoDiagnosticoEm: ultimo?.criadoEm,
    ultimoNivel: ultimo?.nivel ?? null,
  };
}

export const pacientesHandlers = [
  http.get(url("/api/v1/pacientes"), ({ request }) => {
    const profissionalId = new URL(request.url).searchParams.get("profissionalId");
    const filtrados = profissionalId
      ? pacientes.filter((p) => p.profissionalVinculadoId === profissionalId)
      : pacientes;
    return HttpResponse.json(filtrados.map(comResumo));
  }),

  http.get(url("/api/v1/pacientes/:id"), ({ params }) => {
    const paciente = pacientes.find((p) => p.id === params.id);
    if (!paciente) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(comResumo(paciente));
  }),
];
