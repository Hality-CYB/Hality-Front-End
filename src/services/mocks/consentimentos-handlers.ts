import { http, HttpResponse } from "msw";
import { z } from "zod";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { usuarioDoRequest } from "@/services/mocks/auth-handlers";
import type { DecisaoConsentimento, Finalidade } from "@/types/consentimento";

/**
 * Espelho de `/consentimentos/termos` e `/users/me/consentimentos` (#160 do
 * back). Os textos são os mesmos rascunhos de `app/core/consentimentos.py`,
 * ainda sem a revisão do jurídico (OPEN-06).
 */

const url = (path: string) => `${config.apiBaseUrl}${path}`;

const CONTATO = "Dúvidas ou pedidos sobre os seus dados: [e-mail do encarregado de dados].";

export const TERMOS_MOCK = [
  {
    finalidade: "health_data" as const,
    versao: "v1",
    obrigatorio: true,
    titulo: "Tratamento de dados de saúde",
    texto: [
      "Para gerar o seu pré-diagnóstico de halitose, o Check Your Breath precisa tratar dados pessoais sensíveis sobre a sua saúde. Ao marcar esta opção, você dá o seu consentimento específico e destacado para esse tratamento, conforme o art. 11, inciso I, da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
      "",
      "Quais dados",
      "- As respostas da anamnese (hábitos de higiene, saúde bucal e sintomas).",
      "- As fotos da sua língua enviadas para análise.",
      "- O resultado do pré-diagnóstico gerado pela inteligência artificial e as revisões feitas por profissionais de saúde.",
      "",
      "Para que",
      "- Gerar o pré-diagnóstico e as orientações para o seu nível de hálito.",
      "- Permitir que o profissional de saúde vinculado a você revise o resultado.",
      "- Guardar o seu histórico para você acompanhar a evolução.",
      "",
      "Quem tem acesso",
      "Você, os profissionais de saúde vinculados à sua conta e a equipe autorizada da Hality Diagnóstico do Hálito, que acessa os dados só quando necessário para operar e dar suporte ao serviço. Os seus dados de saúde não são vendidos nem usados para publicidade.",
      "",
      "O pré-diagnóstico é uma triagem feita por inteligência artificial e não substitui a avaliação de um profissional de saúde.",
      "",
      "Este consentimento é obrigatório para usar o app, porque sem esses dados não é possível fazer o pré-diagnóstico. Você pode revogá-lo a qualquer momento em Perfil > Privacidade. Depois da revogação, não será possível fazer novos diagnósticos, e o que já foi feito continua guardado pelo prazo descrito na Política de Privacidade.",
      "",
      CONTATO,
    ].join("\n"),
  },
  {
    finalidade: "image_training" as const,
    versao: "v1",
    obrigatorio: false,
    titulo: "Uso da imagem para treinamento",
    texto: [
      "Esta autorização é opcional. Se você não marcar, o app funciona exatamente do mesmo jeito.",
      "",
      "Ao marcar esta opção, você autoriza a Hality Diagnóstico do Hálito a usar as fotos da sua língua enviadas no app, junto com o resultado do pré-diagnóstico e da revisão do profissional, para treinar e avaliar o modelo de inteligência artificial que faz a análise.",
      "",
      "Como as fotos são usadas",
      "- Antes de entrar na base de treinamento, as fotos são separadas do seu nome, e-mail, telefone e respostas da anamnese.",
      "- Elas são usadas só para melhorar a precisão do pré-diagnóstico.",
      "- Não são publicadas, vendidas nem usadas em publicidade.",
      "",
      "Você pode revogar esta autorização a qualquer momento em Perfil > Privacidade. A partir da revogação, as suas fotos não entram em novos treinamentos. [Definir com o jurídico/Hality: o que acontece com fotos já usadas em treinamentos anteriores.]",
      "",
      CONTATO,
    ].join("\n"),
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
