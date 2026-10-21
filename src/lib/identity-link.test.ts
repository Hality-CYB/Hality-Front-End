import { describe, expect, it } from "vitest";
import { readIdentityLink } from "@/lib/identity-link";
import { identityPasswordSchema } from "@/types/auth";

describe("links de identidade", () => {
  it("interpreta o link gerado pela outbox na raiz", () => {
    expect(
      readIdentityLink(
        new URL("https://cyb.test/?purpose=invitation&token=token-sintetico-para-teste"),
      ),
    ).toMatchObject({ purpose: "invitation", status: "ready" });
  });
  it("aceita o token na rota explícita sem presumir que ele foi verificado", () => {
    expect(
      readIdentityLink(
        new URL("https://cyb.test/redefinir-senha?token=token-sintetico-para-teste"),
        "password_reset",
      ),
    ).toMatchObject({ purpose: "password_reset", status: "ready" });
  });
  it.each([
    "?token=curto",
    "?purpose=outro&token=token-sintetico-para-teste",
    "?token=token-sintetico-para-teste&token=outro",
    "?purpose=invitation&purpose=password_reset&token=token-sintetico-para-teste",
  ])("rejeita link ambíguo ou malformado %s", (query) => {
    expect(readIdentityLink(new URL(`https://cyb.test/${query}`), "invitation")).toMatchObject({
      status: "invalid",
      token: null,
    });
  });
  it("mantém a landing sem ação de identidade", () => {
    expect(readIdentityLink(new URL("https://cyb.test/"))).toEqual({
      purpose: null,
      token: null,
      status: "missing",
    });
  });

  it.each([
    "?purpose=outro",
    "?token=curto",
    "?purpose=outro&token=outro",
    "?purpose=&token=outro",
  ])("ignora parâmetros fora do contrato na raiz: %s", (query) => {
    expect(readIdentityLink(new URL(`https://cyb.test/${query}`))).toEqual({
      purpose: null,
      token: null,
      status: "missing",
    });
  });

  it.each([
    "?purpose=invitation&purpose=outro",
    "?purpose=outro&purpose=invitation",
    "?purpose=invitation&token=um&token=outro",
  ])("recusa parâmetros ambíguos de identidade sem presumir outro fluxo: %s", (query) => {
    expect(readIdentityLink(new URL(`https://cyb.test/${query}`))).toEqual({
      purpose: "invitation",
      token: null,
      status: "invalid",
    });
  });
  it.each(["", "Ab1", "abcdefgh1", "ABCDEFGH1", "SemNumeros"])(
    "rejeita senha fora dos requisitos da referência: %s",
    (password) => {
      expect(identityPasswordSchema.safeParse(password).success).toBe(false);
    },
  );
  it("aceita senha com todos os requisitos da referência", () => {
    expect(identityPasswordSchema.safeParse("Segura123").success).toBe(true);
  });
});
