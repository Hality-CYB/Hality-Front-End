import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import type { DecisaoConsentimento, Finalidade } from "@/types/consentimento";

/**
 * Espelho de `/consentimentos/termos` e `/users/me/consentimentos` (#160 do
 * back). Os textos são placeholders, como no back (OPEN-06).
 */

const url = (path: string) => `${config.apiBaseUrl}${path}`;

export const TERMOS_MOCK = [
  {
    finalidade: "health_data" as const,
    versao: "v1",
    obrigatorio: true,
    titulo: "Tratamento de dados de saúde",
    texto: "[TEXTO PROVISÓRIO — aguardando aprovação jurídica (OPEN-06)]",
  },
  {
    finalidade: "image_training" as const,
    versao: "v1",
    obrigatorio: false,
    titulo: "Uso da imagem para treinamento",
    texto: "[TEXTO PROVISÓRIO — aguardando aprovação jurídica (OPEN-06)]",
  },
];

type Evento = DecisaoConsentimento & { em: string };
/** Histórico por usuário: decidir de novo acrescenta, nunca apaga. */
const eventos = new Map<string, Evento[]>();

const decisaoSchema = z
  .object({
    finalidade: z.enum(["health_data", "image_training"]),
    versao: z.string().min(1),
    aceito: z.boolean(),
  })
  .strict();

function termo(finalidade: Finalidade) {
  return TERMOS_MOCK.find((t) => t.finalidade === finalidade)!;
}

/** Mesmas regras do back no cadastro: sem repetir finalidade e com aceite de dados de saúde. */
export function validarDecisoesCadastroMock(decisoes: DecisaoConsentimento[]): void {
  const finalidades = decisoes.map((d) => d.finalidade);
  if (new Set(finalidades).size !== finalidades.length) {
    throw new ApiError(422, "finalidade de consentimento repetida");
  }
  for (const d of decisoes) {
    const vigente = termo(d.finalidade).versao;
    if (d.versao !== vigente) {
      throw new ApiError(409, `versão do termo desatualizada; versão vigente: ${vigente}`);
    }
  }
  if (!decisoes.some((d) => d.finalidade === "health_data" && d.aceito)) {
    throw new ApiError(422, "o consentimento para tratamento de dados de saúde é obrigatório");
  }
}

export function registrarDecisoesMock(usuarioId: string, decisoes: DecisaoConsentimento[]): void {
  const em = new Date().toISOString();
  eventos.set(usuarioId, [
    ...(eventos.get(usuarioId) ?? []),
    ...decisoes.map((d) => ({ ...d, em })),
  ]);
}

function estado(usuarioId: string) {
  const historico = eventos.get(usuarioId) ?? [];
  return {
    consentimentos: TERMOS_MOCK.map((t) => {
      const ultimo = historico.filter((e) => e.finalidade === t.finalidade).at(-1);
      const vigente = !!ultimo && ultimo.aceito && ultimo.versao === t.versao;
      return {
        finalidade: t.finalidade,
        obrigatorio: t.obrigatorio,
        versao_vigente: t.versao,
        versao_decidida: ultimo?.versao ?? null,
        aceito: ultimo?.aceito ?? null,
        vigente,
        requer_decisao: !ultimo || ultimo.versao !== t.versao,
        decidido_em: ultimo?.em ?? null,
      };
    }),
    recorded_at: historico.at(-1)?.em ?? null,
  };
}

/** Como o back: só barra quem decidiu e não está vigente (recusou, revogou ou termo velho). */
export function tratamentoBloqueadoMock(usuarioId: string): boolean {
  const saude = estado(usuarioId).consentimentos.find((c) => c.finalidade === "health_data")!;
  return saude.aceito !== null && !saude.vigente;
}

export const consentimentosHandlers = [
  http.get(url("/api/v1/consentimentos/termos"), () => HttpResponse.json({ itens: TERMOS_MOCK })),

  http.get(url("/api/v1/users/me/consentimentos"), ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(estado(usuario.id));
  }),

  http.post(url("/api/v1/users/me/consentimentos"), async ({ request }) => {
    const usuario = usuarioDoRequest(request);
    if (!usuario) return new HttpResponse(null, { status: 401 });
    const body = decisaoSchema.safeParse(await request.json());
    if (!body.success) return HttpResponse.json({ detail: "dados inválidos" }, { status: 422 });
    const vigente = termo(body.data.finalidade).versao;
    if (body.data.versao !== vigente) {
      return HttpResponse.json(
        { detail: `versão do termo desatualizada; versão vigente: ${vigente}` },
        { status: 409 },
      );
    }
    registrarDecisoesMock(usuario.id, [body.data]);
    return HttpResponse.json(estado(usuario.id));
  }),
];
