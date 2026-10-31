import { describe, expect, it } from "vitest";
import { periodoParaFiltro } from "@/lib/date-period";

describe("periodoParaFiltro", () => {
  const agora = new Date("2026-09-18T15:00:00.000Z");

  it("Todos não filtra por data", () => {
    expect(periodoParaFiltro("Todos", null, agora)).toEqual({});
  });

  it.each([
    ["7d", 7],
    ["30d", 30],
    ["90d", 90],
  ] as const)("%s começa exatamente %i dias antes de agora e não tem fim", (period, dias) => {
    expect(periodoParaFiltro(period, null, agora)).toEqual({
      dataInicio: new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  it("período customizado vai do início do dia inicial ao fim do dia final, no fuso local", () => {
    const filtro = periodoParaFiltro("custom", { start: "2026-09-01", end: "2026-09-10" }, agora);

    expect(filtro).toEqual({
      dataInicio: new Date(2026, 8, 1, 0, 0, 0, 0).toISOString(),
      dataFim: new Date(2026, 8, 10, 23, 59, 59, 999).toISOString(),
    });
  });

  it("período customizado incompleto não filtra", () => {
    expect(periodoParaFiltro("custom", null, agora)).toEqual({});
    expect(periodoParaFiltro("custom", { start: "2026-09-01", end: "" }, agora)).toEqual({});
  });
});
