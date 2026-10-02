import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ANAMNESE_QUESTIONARIO_MOCK } from "@/lib/anamnese-questions";
import { seedAnamneses } from "@/services/mocks/seed-data";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import { PACIENTE_MOCK_ID, pacientesMock, temVinculo } from "@/services/mocks/mock-db";
import { backendRespostaItemSchema, type BackendAnamneseDetail } from "@/types/anamnese";
import { z } from "zod";

const anamneses = [...seedAnamneses];
let proximoId = Math.max(...anamneses.map((a) => a.id)) + 1;
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarAnamneseSchema = z.object({
  versao_questionario: z.string(),
  respostas: z.array(backendRespostaItemSchema),
});

/** Respostas da anamnese, como o back embute no detalhe do diagnóstico. */
export function respostasDaAnamnese(id: string): BackendAnamneseDetail["respostas"] {
  return anamneses.find((a) => String(a.id) === id)?.respostas ?? [];
}

/** Paciente dono da anamnese — é dele que o diagnóstico criado a partir dela passa a ser. */
export function titularDaAnamnese(id: string): string | undefined {
  return anamneses.find((a) => String(a.id) === id)?.paciente_id;
}

export const anamneseHandlers = [
  http.get(url("/api/v1/anamneses/questionario"), () =>
    HttpResponse.json(ANAMNESE_QUESTIONARIO_MOCK),
  ),

  http.get(url("/api/v1/anamneses/:id"), ({ params }) => {
    const anamnese = anamneses.find((a) => String(a.id) === params.id);
    if (!anamnese) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(anamnese);
  }),

  http.post(url("/api/v1/anamneses"), async ({ request }) =>
    criarAnamnese(PACIENTE_MOCK_ID, criarAnamneseSchema.parse(await request.json()).respostas),
  ),

  // Profissional preenchendo para um paciente vinculado (PR #91 do back).
  http.post(url("/api/v1/pacientes/:id/anamneses"), async ({ params, request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    const pacienteId = String(params.id);
    if (usuario.role !== "profissional") {
      return HttpResponse.json(
        { detail: "apenas profissionais podem atender outro paciente" },
        { status: 403 },
      );
    }
    if (!pacientesMock.some((p) => p.id === pacienteId)) {
      return HttpResponse.json({ detail: "paciente indisponível" }, { status: 404 });
    }
    if (!temVinculo(pacienteId, usuario.id)) {
      return HttpResponse.json(
        { detail: "profissional sem vínculo com o paciente" },
        { status: 403 },
      );
    }
    return criarAnamnese(pacienteId, criarAnamneseSchema.parse(await request.json()).respostas);
  }),
];

function criarAnamnese(pacienteId: string, respostas: BackendAnamneseDetail["respostas"]) {
  const anamnese: BackendAnamneseDetail = {
    id: proximoId++,
    paciente_id: pacienteId,
    data_preenchimento: new Date().toISOString(),
    respostas,
  };
  anamneses.push(anamnese);
  return HttpResponse.json(
    {
      id: anamnese.id,
      paciente_id: anamnese.paciente_id,
      data_preenchimento: anamnese.data_preenchimento,
    },
    { status: 201 },
  );
}
