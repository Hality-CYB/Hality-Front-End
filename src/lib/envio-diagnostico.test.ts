import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { FalhaNaAnalise, idDoDiagnosticoExistente, tipoDoErro } from "@/lib/envio-diagnostico";

describe("envio de diagnóstico: o que fazer depois de um erro", () => {
  it.each([
    ["falha da IA pede outra foto", new FalhaNaAnalise("x"), "foto"],
    ["imagem grande demais pede outra foto", new ApiError(413, ""), "foto"],
    ["consentimento revogado leva à privacidade", new ApiError(403, ""), "consentimento"],
    ["erro do servidor deixa tentar de novo", new ApiError(500, ""), "rede"],
    ["sem conexão deixa tentar de novo", new TypeError("Failed to fetch"), "rede"],
    ["demora no resultado deixa tentar de novo", new Error("demorando"), "rede"],
  ])("%s", (_, erro, tipo) => {
    expect(tipoDoErro(erro)).toBe(tipo);
  });

  it("409 de reenvio traz o diagnóstico que já existe", () => {
    const erro = new ApiError(409, JSON.stringify({ detail: "x", diagnostico_id: 42 }));
    expect(idDoDiagnosticoExistente(erro)).toBe("42");
  });

  it("outros erros não são reenvio", () => {
    expect(idDoDiagnosticoExistente(new ApiError(409, "texto solto"))).toBeNull();
    expect(
      idDoDiagnosticoExistente(new ApiError(500, JSON.stringify({ diagnostico_id: 1 }))),
    ).toBeNull();
    expect(idDoDiagnosticoExistente(new Error("x"))).toBeNull();
  });
});
