import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { idDoDiagnosticoExistente } from "@/lib/envio-diagnostico";
import { clearStoredToken, setStoredToken } from "@/lib/session";
import { diagnosticoService } from "@/services/diagnostico-service";

const TOKEN = "mock-token:paciente-1";

beforeEach(() => setStoredToken(TOKEN));
afterEach(() => clearStoredToken());

const foto = (tipo = "image/jpeg") =>
  new File([new Uint8Array([1, 2, 3])], "lingua", { type: tipo });

async function novaAnamnese(): Promise<string> {
  const resposta = await fetch(`${config.apiBaseUrl}/api/v1/anamneses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ versao_questionario: "1", respostas: [] }),
  });
  return String(((await resposta.json()) as { id: number }).id);
}

describe("diagnosticoService.criar contra o mock do back", () => {
  it("alvo, envio e confirmação criam o diagnóstico, e reenviar devolve o 409 com o id", async () => {
    const anamneseId = await novaAnamnese();

    const criado = await diagnosticoService.criar({
      anamneseId,
      imagem: foto(),
      parametrosCaptura: {},
    });
    expect(criado.status).toBe("processando");

    const erro = await diagnosticoService
      .criar({ anamneseId, imagem: foto(), parametrosCaptura: {} })
      .catch((e: unknown) => e);
    expect(idDoDiagnosticoExistente(erro)).toBe(criado.id);
  });

  it("formato fora de JPEG, PNG e WEBP volta com o motivo do back", async () => {
    const anamneseId = await novaAnamnese();

    const erro = await diagnosticoService
      .criar({ anamneseId, imagem: foto("image/gif"), parametrosCaptura: {} })
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 400 });
    expect(JSON.parse((erro as Error).message)).toEqual({
      motivo: "Formato de imagem inválido. Envie JPEG, PNG ou WEBP.",
    });
  });
});
