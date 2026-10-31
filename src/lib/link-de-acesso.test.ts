import { describe, expect, it } from "vitest";
import { lerLinkDeAcesso } from "@/lib/link-de-acesso";

describe("link de acesso do e-mail", () => {
  it("interpreta o link gerado pela outbox na raiz", () => {
    expect(
      lerLinkDeAcesso(
        new URL("https://cyb.test/?purpose=invitation&token=token-sintetico-para-teste"),
      ),
    ).toMatchObject({ finalidade: "convite", status: "pronto" });
  });
  it("aceita o token na rota explícita sem presumir que ele foi verificado", () => {
    expect(
      lerLinkDeAcesso(
        new URL("https://cyb.test/redefinir-senha?token=token-sintetico-para-teste"),
        "recuperacao",
      ),
    ).toMatchObject({ finalidade: "recuperacao", status: "pronto" });
  });
  it.each([
    "?token=curto",
    "?purpose=outro&token=token-sintetico-para-teste",
    "?token=token-sintetico-para-teste&token=outro",
    "?purpose=invitation&purpose=password_reset&token=token-sintetico-para-teste",
  ])("rejeita link ambíguo ou malformado %s", (query) => {
    expect(lerLinkDeAcesso(new URL(`https://cyb.test/${query}`), "convite")).toMatchObject({
      status: "invalido",
      token: null,
    });
  });
  it("mantém a landing sem ação de identidade", () => {
    expect(lerLinkDeAcesso(new URL("https://cyb.test/"))).toEqual({
      finalidade: null,
      token: null,
      status: "ausente",
    });
  });

  it.each([
    "?purpose=outro",
    "?token=curto",
    "?purpose=outro&token=outro",
    "?purpose=&token=outro",
  ])("ignora parâmetros fora do contrato na raiz: %s", (query) => {
    expect(lerLinkDeAcesso(new URL(`https://cyb.test/${query}`))).toEqual({
      finalidade: null,
      token: null,
      status: "ausente",
    });
  });

  it.each([
    "?purpose=invitation&purpose=outro",
    "?purpose=outro&purpose=invitation",
    "?purpose=invitation&token=um&token=outro",
  ])("recusa parâmetros ambíguos de identidade sem presumir outro fluxo: %s", (query) => {
    expect(lerLinkDeAcesso(new URL(`https://cyb.test/${query}`))).toEqual({
      finalidade: "convite",
      token: null,
      status: "invalido",
    });
  });
});
