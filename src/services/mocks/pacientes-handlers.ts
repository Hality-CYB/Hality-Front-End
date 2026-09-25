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

  // Cadastro básico feito pelo profissional (RF-Avaliar paciente, Design/'s
  // EvaluatePatient "Cadastrar novo paciente") — só nome/e-mail/telefone,
  // sem senha/consentimento ainda (igual Design/, que também não implementa
  // o envio de e-mail com senha, só o cadastro básico pra liberar a avaliação).
  http.post(url("/api/v1/pacientes"), async ({ request }) => {
    const body = (await request.json()) as {
      nome: string;
      email: string;
      telefone?: string;
      profissionalVinculadoId?: string;
    };
    const novo = {
      id: `paciente-${Date.now()}`,
      nome: body.nome,
      email: body.email,
      role: "paciente" as const,
      criadoEm: new Date().toISOString(),
      telefone: body.telefone ?? "",
      profissionalVinculadoId: body.profissionalVinculadoId,
      consentimentoDadosSaude: { aceito: false },
      consentimentoTreinamentoIA: { aceito: false },
    };
    pacientes.push(novo);
    return HttpResponse.json(comResumo(novo), { status: 201 });
  }),

  // Vincular paciente a um profissional (RF05 — admin faz esse vínculo).
  http.put(url("/api/v1/pacientes/:id/vincular-profissional"), async ({ params, request }) => {
    const index = pacientes.findIndex((p) => p.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { profissionalId: string };
    const atual = pacientes[index];
    if (!atual) return new HttpResponse(null, { status: 404 });
    const atualizado = { ...atual, profissionalVinculadoId: body.profissionalId };
    pacientes[index] = atualizado;
    return HttpResponse.json(comResumo(atualizado));
  }),
];
