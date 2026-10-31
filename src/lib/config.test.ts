import { afterEach, describe, expect, it, vi } from "vitest";

/** TASK-209: o mock só liga com `enabled` explícito; ausente ou outro valor = back real. */
describe("config.apiMocking", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    [undefined, false],
    ["disabled", false],
    ["qualquer coisa", false],
    ["enabled", true],
  ])("NEXT_PUBLIC_API_MOCKING=%s → mock %s", async (valor, esperado) => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", valor as string);
    if (valor === undefined) delete process.env.NEXT_PUBLIC_API_MOCKING;
    vi.resetModules();
    const { config: novo } = await import("@/lib/config");
    expect(novo.apiMocking).toBe(esperado);
  });
});
