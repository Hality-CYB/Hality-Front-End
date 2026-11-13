import { expect, type APIRequestContext } from "@playwright/test";
import { z } from "zod";
import { statusDiagnosticoSchema } from "../../src/types/diagnostico";
import { API_URL } from "./config";
import { imagemLingua } from "./imagem";
import { questionarioSchema, type Pergunta } from "./questionario";

const idSchema = z.object({ id: z.number() });
const statusSchema = z.object({ status: statusDiagnosticoSchema });
const resultadoSchema = z.object({
  classificacao: z.object({
    id: z.number(),
    codigo: z.string(),
    nome_exibicao: z.string(),
    ordem: z.number(),
  }),
});

const alvoSchema = z.object({
  url: z.string(),
  fields: z.record(z.string(), z.string()),
  upload_token: z.string(),
});

/** Envia a foto ao alvo como o navegador: `fields` na ordem e o arquivo por último, sem token. */
export function enviarParaAlvo({
  request,
  alvo,
  arquivo,
}: {
  request: APIRequestContext;
  alvo: { url: string; fields: Record<string, string> };
  arquivo: Buffer;
}) {
  return request.post(new URL(alvo.url, API_URL).toString(), {
    multipart: {
      ...alvo.fields,
      file: {
        name: "lingua.png",
        mimeType: alvo.fields["Content-Type"] ?? "image/png",
        buffer: arquivo,
      },
    },
  });
}

function respostaDePreparacao(pergunta: Pergunta) {
  switch (pergunta.tipo) {
    case "boolean":
      return false;
    case "single_choice": {
      const opcao = pergunta.opcoes?.[0];
      if (opcao === undefined) throw new Error("Pergunta de escolha sem opções");
      return opcao;
    }
    case "scale":
      return pergunta.escala_min;
    case "text":
      return "Teste";
    default: {
      const _exhaustive: never = pergunta.tipo;
      throw new Error(`Tipo de pergunta não suportado: ${_exhaustive}`);
    }
  }
}

/** Prepara um diagnóstico real e devolve a classificação obtida, sem prevê-la pelo ID. */
export async function criarDiagnostico({
  request,
  headers,
  statusEsperado,
}: {
  request: APIRequestContext;
  headers: { Authorization: string };
  statusEsperado?: Exclude<z.infer<typeof statusDiagnosticoSchema>, "processando" | "falha">;
}) {
  const questionario = await request.get(`${API_URL}/anamneses/questionario`, { headers });
  expect(questionario.ok()).toBeTruthy();
  const catalogo = questionarioSchema.parse(await questionario.json());
  const respostas = catalogo.perguntas.map((pergunta) => ({
    pergunta_id: pergunta.id,
    valor_bruto: respostaDePreparacao(pergunta),
  }));
  const anamnese = await request.post(`${API_URL}/anamneses`, {
    headers,
    data: { versao_questionario: catalogo.versao, respostas },
  });
  expect(anamnese.ok(), await anamnese.text()).toBeTruthy();
  const { id } = idSchema.parse(await anamnese.json());
  const alvoResposta = await request.post(`${API_URL}/diagnosticos/upload`, {
    headers,
    data: { anamnese_id: id, content_type: "image/png" },
  });
  expect(alvoResposta.status(), await alvoResposta.text()).toBe(200);
  const alvo = alvoSchema.parse(await alvoResposta.json());
  const envio = await enviarParaAlvo({ request, alvo, arquivo: imagemLingua });
  expect(envio.status(), await envio.text()).toBe(204);
  const diagnostico = await request.post(`${API_URL}/diagnosticos`, {
    headers,
    data: { anamnese_id: id, upload_token: alvo.upload_token, parametros_captura: {} },
  });
  expect(diagnostico.status(), await diagnostico.text()).toBe(202);
  const criado = idSchema.parse(await diagnostico.json());
  const polling = expect.poll(
    async () => {
      const resposta = await request.get(`${API_URL}/diagnosticos/${criado.id}`, { headers });
      return statusSchema.parse(await resposta.json()).status;
    },
    { timeout: 15_000, intervals: [250] },
  );
  if (statusEsperado) await polling.toBe(statusEsperado);
  else await polling.not.toBe("processando");
  const pronto = await request.get(`${API_URL}/diagnosticos/${criado.id}`, { headers });
  expect(pronto.ok()).toBeTruthy();
  const { classificacao } = resultadoSchema.parse(await pronto.json());
  return { id: criado.id, classificacao, ordemIA: classificacao.ordem };
}
