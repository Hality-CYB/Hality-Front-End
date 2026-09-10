import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ANAMNESE_QUESTIONS } from "@/lib/anamnese-questions";
import { seedAnamneses } from "@/services/mocks/seed-data";
import { respostaAnamneseSchema, type Anamnese } from "@/types/anamnese";
import { z } from "zod";

const anamneses = [...seedAnamneses];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarAnamneseSchema = z.object({
  respostas: z.array(respostaAnamneseSchema),
});

export const anamneseHandlers = [
  http.get(url("/api/v1/anamnese/perguntas"), () => HttpResponse.json(ANAMNESE_QUESTIONS)),

  http.get(url("/api/v1/anamnese/:id"), ({ params }) => {
    const anamnese = anamneses.find((a) => a.id === params.id);
    if (!anamnese) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(anamnese);
  }),

  http.post(url("/api/v1/anamnese"), async ({ request }) => {
    const body = criarAnamneseSchema.parse(await request.json());
    const anamnese: Anamnese = { id: `anamnese-${crypto.randomUUID()}`, ...body };
    anamneses.push(anamnese);
    return HttpResponse.json(anamnese, { status: 201 });
  }),
];
