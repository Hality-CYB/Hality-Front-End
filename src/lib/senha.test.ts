import { describe, expect, it } from "vitest";
import { problemaDaSenha, senhaValida } from "@/lib/senha";

describe("regra de senha nova (igual à do back)", () => {
  it.each(["", "Ab1", "abcdefgh1", "ABCDEFGH1", "SemNumeros"])("recusa %s", (senha) => {
    expect(senhaValida(senha)).toBe(false);
  });

  it("aceita senha com maiúscula, minúscula e número", () => {
    expect(senhaValida("Segura123")).toBe(true);
    expect(senhaValida("Ção12345")).toBe(true);
  });

  it("recusa senha padrão mesmo cumprindo os requisitos", () => {
    expect(problemaDaSenha("Hality1234")).toBe("Essa senha é comum demais. Escolha outra.");
  });
});
