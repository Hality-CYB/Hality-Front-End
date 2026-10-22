import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

describe("política de referrer dos links de identidade", () => {
  it.each([
    "/",
    "/?utm_source=campanha",
    "/?purpose=outro&token=outro",
    "/?token=outra-funcionalidade",
  ])("preserva a política da landing normal: %s", (path) => {
    const request = new NextRequest(new URL(path, "https://cyb.test"));
    const response = proxy(request);
    expect(response.headers.get("Referrer-Policy")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(request.url).toBe(new URL(path, "https://cyb.test").href);
  });

  it.each([
    "/?purpose=invitation&token=token-sintetico-somente-para-testes",
    "/?purpose=password_reset&token=token-sintetico-somente-para-testes",
    "/?purpose=invitation&token=curto",
    "/?purpose=invitation&purpose=outro&token=curto",
    "/?purpose=outro&purpose=invitation&token=curto",
  ])("protege a resposta inicial de identidade sem redirecionar: %s", (path) => {
    const response = proxy(new NextRequest(new URL(path, "https://cyb.test")));
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("location")).toBeNull();
  });

  it("executa exclusivamente na raiz, sem alterar login, registro ou assets", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "https://cyb.test/" })).toBe(true);
    for (const path of [
      "/login",
      "/registro",
      "/paciente",
      "/primeiro-acesso",
      "/redefinir-senha",
      "/_next/static/script.js",
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url: `https://cyb.test${path}` })).toBe(false);
    }
  });
});
