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
    const status = params.get("status");
    const dataInicio = params.get("data_inicio");
    const dataFim = params.get("data_fim");
    const pagina = Number(params.get("pagina") ?? 1);
    const limite = Number(params.get("limite") ?? 20);
    const ordem = params.get("ordem") ?? "data_desc";

    let filtrados = diagnosticos.filter((d) => d.pacienteId === "paciente-1");
    if (status) filtrados = filtrados.filter((d) => d.status === status);
    if (dataInicio)
      filtrados = filtrados.filter((d) => new Date(d.criadoEm) >= new Date(dataInicio));
    if (dataFim) filtrados = filtrados.filter((d) => new Date(d.criadoEm) <= new Date(dataFim));
    filtrados = [...filtrados].sort((a, b) => {
      const diff = new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      return ordem === "data_asc" ? diff : -diff;
    });

    const itens = filtrados.slice((pagina - 1) * limite, pagina * limite).map((d) => {
      const detalhe = paraBackendDetail(d);
      return {
        id: detalhe.id,
        data_diagnostico: detalhe.data_diagnostico,
        status: detalhe.status,
        classificacao: detalhe.classificacao && {
          codigo: detalhe.classificacao.codigo,
          nome_exibicao: detalhe.classificacao.nome_exibicao,
          ordem: detalhe.classificacao.ordem,
        },
        escala_saburra: detalhe.escala_saburra,
      };
    });

    return HttpResponse.json({
      itens,
      pagina,
      limite,
      total: filtrados.length,
      total_paginas: Math.ceil(filtrados.length / limite),
    });
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
