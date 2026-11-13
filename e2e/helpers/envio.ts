import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { API_URL } from "./config";

export const ROTA_ALVO_FOTO = `${API_URL}/diagnosticos/upload`;
export const ROTA_ALVO_MIDIA = `${API_URL}/admin/conteudos/midias/upload`;
export const ROTA_UPLOAD_LOCAL = `${API_URL}/uploads/local`;

function esperarPost(page: Page, url: string) {
  return page.waitForResponse((r) => r.url() === url && r.request().method() === "POST");
}

/** Começa a observar o envio direto da foto: alvo, envio ao storage e confirmação. */
export function observarEnvioDaFoto(page: Page) {
  return {
    alvo: esperarPost(page, ROTA_ALVO_FOTO),
    upload: esperarPost(page, ROTA_UPLOAD_LOCAL),
    confirmacao: esperarPost(page, `${API_URL}/diagnosticos`),
  };
}

/** Começa a observar o envio direto da mídia de conteúdo: alvo e envio ao storage. */
export function observarEnvioDaMidia(page: Page) {
  return {
    alvo: esperarPost(page, ROTA_ALVO_MIDIA),
    upload: esperarPost(page, ROTA_UPLOAD_LOCAL),
  };
}

/** O envio ao storage vai sem credencial da sessão, só com a policy assinada nos campos. */
export async function conferirEnvioAoStorage(upload: Response) {
  expect(upload.status()).toBe(204);
  expect(await upload.request().headerValue("authorization")).toBeNull();
  expect(upload.request().headers()["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
}

/** Confere os três passos da foto e devolve a resposta da confirmação (JSON, nunca multipart). */
export async function conferirEnvioDaFoto(envio: ReturnType<typeof observarEnvioDaFoto>) {
  expect((await envio.alvo).status()).toBe(200);
  await conferirEnvioAoStorage(await envio.upload);
  const confirmacao = await envio.confirmacao;
  expect(confirmacao.request().headers()["content-type"]).toMatch(/^application\/json/);
  return confirmacao;
}

/** A imagem terminou de carregar com conteúdo (lida pela rota de leitura da API, que o storage serve). */
export async function esperarImagemCarregada(imagem: Locator) {
  await expect(imagem).toBeVisible();
  await expect
    .poll(() => imagem.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}
