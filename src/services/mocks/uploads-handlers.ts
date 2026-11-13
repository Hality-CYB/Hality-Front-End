import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import type { AlvoDeUpload } from "@/types/upload";

const url = (path: string) => `${config.apiBaseUrl}${path}`;

type AlvoEmitido = { contentType: string; maxBytes: number };
type ArquivoRecebido = { bytes: ArrayBuffer; tipo: string };

const alvos = new Map<string, AlvoEmitido>();
const recebidos = new Map<string, ArquivoRecebido>();

/** Alvo de envio no formato do presigned POST, como o `POST /uploads/local` do back. */
export function emitirAlvoMock(chave: string, contentType: string, maxBytes: number): AlvoDeUpload {
  alvos.set(chave, { contentType, maxBytes });
  return {
    url: "/api/v1/uploads/local",
    fields: {
      key: chave,
      "Content-Type": contentType,
      policy: `policy-${chave}`,
      signature: `signature-${chave}`,
    },
  };
}

/** Arquivo que chegou ao alvo da chave, se chegou. */
export function arquivoRecebidoMock(chave: string): ArquivoRecebido | undefined {
  return recebidos.get(chave);
}

function erro(status: number, motivo: string) {
  return HttpResponse.json({ motivo }, { status });
}

export const uploadsHandlers = [
  http.post(url("/api/v1/uploads/local"), async ({ request }) => {
    const form = await request.formData();
    const chave = form.get("key");
    const contentType = form.get("Content-Type");
    const policy = form.get("policy");
    const alvo = typeof chave === "string" ? alvos.get(chave) : undefined;
    if (
      !alvo ||
      typeof chave !== "string" ||
      policy !== `policy-${chave}` ||
      contentType !== alvo.contentType
    ) {
      return erro(403, "Alvo de upload inválido ou expirado.");
    }
    // Checa a forma, não a classe: no teste (jsdom) o arquivo vem de outro realm.
    const campo = form.get("file");
    const arquivo =
      typeof campo === "object" && campo !== null && "arrayBuffer" in campo ? campo : null;
    if (!arquivo) return erro(400, "Arquivo ausente.");
    if (arquivo.size === 0) return erro(400, "O arquivo enviado está vazio.");
    if (arquivo.size > alvo.maxBytes) {
      return erro(400, "Arquivo acima do tamanho máximo permitido.");
    }
    if (recebidos.has(chave)) return erro(409, "Este alvo de upload já foi usado.");
    // Guarda os bytes, não o objeto: no teste (jsdom) nem o File nem o Blob
    // globais servem de corpo de Response.
    recebidos.set(chave, { bytes: await arquivo.arrayBuffer(), tipo: alvo.contentType });
    return new HttpResponse(null, { status: 204 });
  }),
];
