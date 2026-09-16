import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ANAMNESE_QUESTIONARIO_MOCK } from "@/lib/anamnese-questions";
import { seedAnamneses } from "@/services/mocks/seed-data";
import { backendRespostaItemSchema, type BackendAnamneseDetail } from "@/types/anamnese";
import { z } from "zod";

const anamneses = [...seedAnamneses];
let proximoId = Math.max(...anamneses.map((a) => a.id)) + 1;
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarAnamneseSchema = z.object({
  versao_questionario: z.string(),
  respostas: z.array(backendRespostaItemSchema),
});

export const anamneseHandlers = [
  http.get(url("/api/v1/anamneses/questionario"), () =>
    HttpResponse.json(ANAMNESE_QUESTIONARIO_MOCK),
  ),

  http.get(url("/api/v1/anamneses/:id"), ({ params }) => {
    const anamnese = anamneses.find((a) => String(a.id) === params.id);
    if (!anamnese) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(anamnese);
  }),

  http.post(url("/api/v1/anamneses"), async ({ request }) => {
    const body = criarAnamneseSchema.parse(await request.json());
    const anamnese: BackendAnamneseDetail = {
      id: proximoId++,
      paciente_id: "paciente-1",
      data_preenchimento: new Date().toISOString(),
      respostas: body.respostas,
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
  }),
];
