import { describe, it, expect, beforeEach, vi } from "vitest";
import { hasActiveSession } from "./session";

describe("session utils (cookie-based)", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { cookie: "" });
  });

  it("retorna false quando não há cookie de sessão", () => {
    vi.stubGlobal("document", { cookie: "" });
    expect(hasActiveSession()).toBe(false);
  });

  it("retorna true quando o cookie fastapiusersauth está presente", () => {
    vi.stubGlobal("document", { cookie: "fastapiusersauth=some-jwt-value; Path=/" });
    expect(hasActiveSession()).toBe(true);
  });

  it("retorna false quando há outros cookies mas não o de sessão", () => {
    vi.stubGlobal("document", { cookie: "outros=valor; Path=/" });
    expect(hasActiveSession()).toBe(false);
  });
});
