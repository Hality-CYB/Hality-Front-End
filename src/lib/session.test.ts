import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  hasActiveSession,
  TOKEN_STORAGE_KEY,
} from "./session";

describe("session utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna null e false quando não há token gravado", () => {
    expect(getStoredToken()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });

  it("grava e recupera o token corretamente", () => {
    setStoredToken("test-jwt-token-123");
    expect(getStoredToken()).toBe("test-jwt-token-123");
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("test-jwt-token-123");
    expect(hasActiveSession()).toBe(true);
  });

  it("limpa o token armazenado", () => {
    setStoredToken("test-jwt-token-123");
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
    expect(hasActiveSession()).toBe(false);
  });
});
