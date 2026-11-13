import { describe, expect, it } from "vitest";
import { formatarTelefone } from "@/lib/telefone";

describe("formatarTelefone", () => {
  it.each([
    ["51999990001", "(51) 99999-0001"],
    ["5133334444", "(51) 3333-4444"],
    ["+55 51 99999-0001", "(51) 99999-0001"],
    ["(51) 99999-0001", "(51) 99999-0001"],
  ])("%s vira %s", (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado);
  });

  it("devolve como veio o que não parece telefone brasileiro", () => {
    expect(formatarTelefone("123")).toBe("123");
    expect(formatarTelefone(" +1 415 555 0100 ")).toBe("+1 415 555 0100");
  });

  it("vazio continua vazio para a tela mostrar o texto padrão", () => {
    expect(formatarTelefone(null)).toBe("");
    expect(formatarTelefone(undefined)).toBe("");
    expect(formatarTelefone("")).toBe("");
  });
});
