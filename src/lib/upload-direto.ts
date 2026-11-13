import { ApiError } from "@/lib/api-client";
import { urlDaApi } from "@/lib/url-da-api";
import type { AlvoDeUpload } from "@/types/upload";

/**
 * Envio do arquivo direto ao alvo que o back devolveu (storage local ou S3).
 * A credencial é a policy assinada nos `fields`, então nunca vai `Authorization`.
 * Os erros viram `ApiError` no formato que as telas já entendem (413 de tamanho,
 * 400 com `motivo`), sem nunca virar 403/409, que as telas leem como consentimento
 * e diagnóstico existente.
 */

export const MENSAGEM_TAMANHO = "arquivo acima do tamanho máximo permitido";
export const MENSAGEM_ARQUIVO_VAZIO = "O arquivo enviado está vazio.";
export const MENSAGEM_ENVIO_EXPIRADO = "O envio do arquivo expirou. Tente de novo.";
export const MENSAGEM_ENVIO_FALHOU = "Não foi possível enviar o arquivo. Tente de novo.";

function erro(status: number, corpo: Record<string, string>): ApiError {
  return new ApiError(status, JSON.stringify(corpo));
}

function erroDoAlvo(status: number, texto: string): ApiError {
  if (status >= 500) return erro(status, { motivo: MENSAGEM_ENVIO_FALHOU });

  // S3: XML com <Code>; local: JSON com `motivo`.
  const codigo = /<Code>([^<]+)<\/Code>/.exec(texto)?.[1];
  let motivo: string | undefined;
  try {
    const corpo = JSON.parse(texto) as { motivo?: unknown };
    if (typeof corpo.motivo === "string") motivo = corpo.motivo;
  } catch {
    // corpo não é JSON
  }

  if (codigo === "EntityTooLarge" || (status === 400 && motivo?.includes("tamanho máximo"))) {
    return erro(413, { detail: MENSAGEM_TAMANHO });
  }
  if (codigo === "EntityTooSmall") return erro(400, { motivo: MENSAGEM_ARQUIVO_VAZIO });
  if (status === 400 && motivo && motivo !== "Alvo de upload inválido ou expirado.") {
    return erro(400, { motivo });
  }
  return erro(400, { motivo: MENSAGEM_ENVIO_EXPIRADO });
}

/** Envia `FormData` com os `fields` na ordem recebida e o arquivo por último (exigência do S3). */
export async function enviarParaAlvo(alvo: AlvoDeUpload, arquivo: File): Promise<void> {
  const form = new FormData();
  for (const [campo, valor] of Object.entries(alvo.fields)) form.append(campo, valor);
  form.append("file", arquivo);

  const resposta = await fetch(urlDaApi(alvo.url), {
    method: "POST",
    body: form,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (resposta.ok) return;
  throw erroDoAlvo(resposta.status, await resposta.text().catch(() => ""));
}
