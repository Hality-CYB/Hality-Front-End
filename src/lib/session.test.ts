import { afterEach, describe, expect, it } from "vitest";
import { clearStoredToken, getStoredToken, hasActiveSession, setStoredToken } from "@/lib/session";

describe("session", () => {
  afterEach(() => {
    clearStoredToken();
  });

  it("não tem sessão ativa quando nenhum token foi salvo", () => {
    expect(getStoredToken()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });

  it("persiste e recupera o token salvo", () => {
    setStoredToken("token-fake");

    expect(getStoredToken()).toBe("token-fake");
    expect(hasActiveSession()).toBe(true);
  });

  it("remove o token ao limpar a sessão", () => {
    setStoredToken("token-fake");
    clearStoredToken();

    expect(getStoredToken()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });
});
