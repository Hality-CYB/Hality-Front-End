import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { seedDiagnosticos } from "@/services/mocks/seed-data";
import {
  diagnosticoNivelSchema,
  type BackendDiagnosticoDetail,
  type Diagnostico,
  type DiagnosticoNivel,
} from "@/types/diagnostico";
import { nivelLabel } from "@/lib/level-format";

const diagnosticos = [...seedDiagnosticos];
const url = (path: string) => `${config.apiBaseUrl}${path}`;

/** Mesmo tempo do mock de IA do back (`MOCK_PROCESSING_SECONDS`). */
const TEMPO_PROCESSAMENTO_MS = 2000;
let proximoId = 900;
const criadosEm = new Map<string, number>();

const revisarDiagnosticoSchema = z.object({
  nivel: diagnosticoNivelSchema,
  revisadoPor: z.string(),
});

/**
 * Sem modelo de IA de verdade, a "análise" é aleatória — só pra ter algo
 * pra mostrar na tela de resultado durante o desenvolvimento. Igual ao
 * back, o diagnóstico nasce "processando" e só vira "concluido" num GET
 * feito depois de TEMPO_PROCESSAMENTO_MS.
 */
function analiseFalsa(): { nivel: DiagnosticoNivel; confiancaIA: number } {
  const niveis = [1, 2, 3] as const;
  const nivel = niveis[Math.floor(Math.random() * niveis.length)] ?? 1;
  const confiancaIA = 70 + Math.floor(Math.random() * 25);
  return { nivel, confiancaIA };
}

const idNumerico = (id: string) => Number(id.replace(/\D/g, ""));

function paraBackendDetail(d: Diagnostico): BackendDiagnosticoDetail {
  return {
    id: idNumerico(d.id),
    data_diagnostico: d.criadoEm,
    status: d.status,
    classificacao:
      d.nivel !== null
        ? {
            id: d.nivel,
            codigo: `nivel_${d.nivel}`,
            nome_exibicao: nivelLabel(d.nivel),
            ordem: d.nivel,
          }
        : null,
    escala_saburra: null,
    confianca_ia: d.confiancaIA === undefined ? null : d.confiancaIA / 100,
    imagens: d.imagemUrl ? [{ id: 1, url_arquivo: d.imagemUrl, ordem: 1 }] : [],
    anamnese: { id: idNumerico(d.anamneseId) },
    erro: null,
  };
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
    const id = String(params.id);
    const index = diagnosticos.findIndex((d) => d.id === id || idNumerico(d.id) === Number(id));
    const diagnostico = diagnosticos[index];
    if (!diagnostico) return new HttpResponse(null, { status: 404 });

    const criadoEm = criadosEm.get(diagnostico.id);
    if (
      diagnostico.status === "processando" &&
      criadoEm !== undefined &&
      Date.now() - criadoEm >= TEMPO_PROCESSAMENTO_MS
    ) {
      diagnosticos[index] = { ...diagnostico, ...analiseFalsa(), status: "concluido" };
    }
    return HttpResponse.json(paraBackendDetail(diagnosticos[index] ?? diagnostico));
  }),

  http.post(url("/api/v1/diagnosticos"), async ({ request }) => {
    const form = await request.formData();
    const anamneseId = form.get("anamnese_id");
    const imagem = form.get("imagem");
    const parametros = form.get("parametros_captura");
    if (!anamneseId || !(imagem instanceof File) || typeof parametros !== "string") {
      return HttpResponse.json({ detail: "campos obrigatórios ausentes" }, { status: 422 });
    }

    const id = String(proximoId++);
    const diagnostico: Diagnostico = {
      id,
      pacienteId: "paciente-1",
      nivel: null,
      status: "processando",
      imagemUrl: "",
      anamneseId: String(anamneseId),
      modeloVersao: "mock-0.1.0",
      criadoEm: new Date().toISOString(),
    };
    diagnosticos.push(diagnostico);
    criadosEm.set(id, Date.now());
    return HttpResponse.json(
      {
        id: Number(id),
        status: diagnostico.status,
        data_diagnostico: diagnostico.criadoEm,
        anamnese_id: Number(anamneseId),
      },
      { status: 202 },
    );
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
