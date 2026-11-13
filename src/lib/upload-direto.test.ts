// @vitest-environment node
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import {
  enviarParaAlvo,
  MENSAGEM_ARQUIVO_VAZIO,
  MENSAGEM_ENVIO_EXPIRADO,
  MENSAGEM_ENVIO_FALHOU,
  MENSAGEM_TAMANHO,
} from "@/lib/upload-direto";
import type { AlvoDeUpload } from "@/types/upload";
import { server } from "@/services/mocks/server";
import { mensagemErroMidia } from "@/hooks/use-conteudos-admin";

const BYTES = new Uint8Array([1, 2, 3, 4]);
const arquivo = () => new File([BYTES], "foto.png", { type: "image/png" });
const alvoLocal = {
  url: "/api/v1/uploads/local",
  fields: { key: "k", "Content-Type": "image/png", policy: "p", signature: "s" },
};
const urlS3 = "https://bucket.s3.sa-east-1.amazonaws.com/";
const alvoS3 = { url: urlS3, fields: { key: "k", policy: "p", "x-amz-signature": "s" } };

function xml(codigo: string, status: number) {
  return new HttpResponse(`<?xml version="1.0"?><Error><Code>${codigo}</Code></Error>`, {
    status,
    headers: { "Content-Type": "application/xml" },
  });
}

async function falha(alvo: AlvoDeUpload = alvoLocal): Promise<ApiError> {
  const erro = await enviarParaAlvo(alvo, arquivo()).catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ApiError);
  return erro as ApiError;
}

const corpo = (erro: ApiError) => JSON.parse(erro.message) as Record<string, string>;

describe("enviarParaAlvo", () => {
  it("manda os fields na ordem recebida e o arquivo por último, com os bytes", async () => {
    let campos: [string, FormDataEntryValue][] = [];
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, async ({ request }) => {
        campos = [...(await request.formData()).entries()];
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await enviarParaAlvo(alvoLocal, arquivo());

    expect(campos.map(([nome]) => nome)).toEqual([
      "key",
      "Content-Type",
      "policy",
      "signature",
      "file",
    ]);
    const enviado = campos.at(-1)![1] as File;
    expect(enviado.name).toBe("foto.png");
    expect(new Uint8Array(await enviado.arrayBuffer())).toEqual(BYTES);
  });

  it("URL relativa vai para a base da API e URL absoluta (S3) fica como está", async () => {
    const urls: string[] = [];
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, ({ request }) => {
        urls.push(request.url);
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(urlS3, ({ request }) => {
        urls.push(request.url);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await enviarParaAlvo(alvoLocal, arquivo());
    await enviarParaAlvo(alvoS3, arquivo());

    expect(urls).toEqual([`${config.apiBaseUrl}/api/v1/uploads/local`, urlS3]);
  });

  it("nunca manda Authorization, mesmo com sessão", async () => {
    setStoredToken("token-de-acesso");
    const autorizacoes: (string | null)[] = [];
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, ({ request }) => {
        autorizacoes.push(request.headers.get("authorization"));
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(urlS3, ({ request }) => {
        autorizacoes.push(request.headers.get("authorization"));
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await enviarParaAlvo(alvoLocal, arquivo());
    await enviarParaAlvo(alvoS3, arquivo());
    clearStoredToken();

    expect(autorizacoes).toEqual([null, null]);
  });

  it("tamanho: local 400 e S3 EntityTooLarge viram 413 com a mensagem de hoje", async () => {
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, () =>
        HttpResponse.json(
          { motivo: "Arquivo acima do tamanho máximo permitido." },
          { status: 400 },
        ),
      ),
      http.post(urlS3, () => xml("EntityTooLarge", 400)),
    );

    for (const alvo of [alvoLocal, alvoS3]) {
      const erro = await falha(alvo);
      expect(erro.status).toBe(413);
      expect(corpo(erro).detail).toBe(MENSAGEM_TAMANHO);
    }
    expect(mensagemErroMidia(await falha())).toBe("Arquivo grande demais. Envie um arquivo menor.");
  });

  it("arquivo vazio: motivo do back no local e EntityTooSmall no S3", async () => {
    server.use(
      http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, () =>
        HttpResponse.json({ motivo: MENSAGEM_ARQUIVO_VAZIO }, { status: 400 }),
      ),
      http.post(urlS3, () => xml("EntityTooSmall", 400)),
    );

    for (const alvo of [alvoLocal, alvoS3]) {
      const erro = await falha(alvo);
      expect(erro.status).toBe(400);
      expect(corpo(erro).motivo).toBe(MENSAGEM_ARQUIVO_VAZIO);
    }
  });

  it("alvo vencido, já usado ou negado vira 400 de envio expirado, nunca 403/409", async () => {
    const respostas = [
      HttpResponse.json({ motivo: "Alvo de upload inválido ou expirado." }, { status: 403 }),
      HttpResponse.json({ motivo: "Este alvo de upload já foi usado." }, { status: 409 }),
      xml("AccessDenied", 403),
    ];
    for (const resposta of respostas) {
      server.use(http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, () => resposta.clone()));
      const erro = await falha();
      expect(erro.status).toBe(400);
      expect(corpo(erro).motivo).toBe(MENSAGEM_ENVIO_EXPIRADO);
    }
  });

  it("5xx vira mensagem genérica de envio", async () => {
    server.use(
      http.post(
        `${config.apiBaseUrl}/api/v1/uploads/local`,
        () => new HttpResponse("x", { status: 503 }),
      ),
    );

    const erro = await falha();

    expect(erro.status).toBe(503);
    expect(corpo(erro).motivo).toBe(MENSAGEM_ENVIO_FALHOU);
  });

  it("falha de rede propaga o TypeError", async () => {
    server.use(http.post(`${config.apiBaseUrl}/api/v1/uploads/local`, () => HttpResponse.error()));

    await expect(enviarParaAlvo(alvoLocal, arquivo())).rejects.toBeInstanceOf(TypeError);
  });
});
