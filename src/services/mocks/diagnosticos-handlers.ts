import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { seedDiagnosticos } from "@/services/mocks/seed-data";
import { diagnosticoNivelSchema, type Diagnostico } from "@/types/diagnostico";

const diagnosticos = [...seedDiagnosticos];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

const criarDiagnosticoSchema = z.object({
  pacienteId: z.string(),
  profissionalId: z.string().optional(),
  imagemUrl: z.string(),
  anamneseId: z.string(),
});

const revisarDiagnosticoSchema = z.object({
  nivel: diagnosticoNivelSchema,
  revisadoPor: z.string(),
});

/**
 * Sem backend/modelo de IA de verdade, a "análise" é determinística — só
 * pra ter algo pra mostrar na tela de resultado durante o desenvolvimento.
 * Processamento assíncrono real (fila, polling) é responsabilidade do
 * backend quando existir; aqui o resultado já vem pronto na resposta.
 */
function analiseFalsa(): { nivel: 1 | 2 | 3; confiancaIA: number } {
  const niveis = [1, 2, 3] as const;
  const nivel = niveis[Math.floor(Math.random() * niveis.length)] ?? 1;
  const confiancaIA = 70 + Math.floor(Math.random() * 25);
  return { nivel, confiancaIA };
}

export const diagnosticosHandlers = [
  http.get(url("/api/v1/diagnosticos"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const pacienteId = params.get("pacienteId");
    const profissionalId = params.get("profissionalId");
    const status = params.get("status");

    let filtrados = diagnosticos;
    if (pacienteId) filtrados = filtrados.filter((d) => d.pacienteId === pacienteId);
    if (profissionalId) filtrados = filtrados.filter((d) => d.profissionalId === profissionalId);
    if (status) filtrados = filtrados.filter((d) => d.status === status);

    return HttpResponse.json(filtrados);
  }),

  http.get(url("/api/v1/diagnosticos/:id"), ({ params }) => {
    const diagnostico = diagnosticos.find((d) => d.id === params.id);
    if (!diagnostico) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(diagnostico);
  }),

  http.post(url("/api/v1/diagnosticos"), async ({ request }) => {
    const body = criarDiagnosticoSchema.parse(await request.json());
    const { nivel, confiancaIA } = analiseFalsa();
    const diagnostico: Diagnostico = {
      id: `diagnostico-${crypto.randomUUID()}`,
      ...body,
      nivel,
      confiancaIA,
      status: "aguardando_revisao",
      modeloVersao: "mock-0.1.0",
      criadoEm: new Date().toISOString(),
    };
    diagnosticos.push(diagnostico);
    return HttpResponse.json(diagnostico, { status: 201 });
  }),

  http.put(url("/api/v1/diagnosticos/:id/revisar"), async ({ params, request }) => {
    const index = diagnosticos.findIndex((d) => d.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = revisarDiagnosticoSchema.parse(await request.json());
    const atual = diagnosticos[index];
    if (!atual) return new HttpResponse(null, { status: 404 });
    const atualizado: Diagnostico = {
      ...atual,
      nivel: body.nivel,
      status: "concluido",
      revisadoPor: body.revisadoPor,
      revisadoEm: new Date().toISOString(),
    };
    diagnosticos[index] = atualizado;
    return HttpResponse.json(atualizado);
  }),
];
