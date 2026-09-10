/**
 * Filtro de período (7/30/90 dias, "todos" ou intervalo customizado) usado
 * nas listas de diagnósticos. Portado de Design/ onde este bloco existia
 * (byte-idêntico) em PatientApp.tsx, ProfessionalApp.tsx e AdminApp.tsx —
 * agora é uma única implementação.
 */

export const PERIODS = ["Todos", "7d", "30d", "90d"] as const;
export type QuickPeriod = (typeof PERIODS)[number];
export type Period = QuickPeriod | "custom";
export type CustomRange = { start: string; end: string };

const periodDays: Record<QuickPeriod, number | null> = {
  Todos: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Ex.: "05/03/2026" -> Date. Formato usado nos registros de diagnóstico. */
export function parseBRDate(s: string): Date {
  const [d, m, y] = s.split("/").map(Number);
  if (d === undefined || m === undefined || y === undefined) {
    throw new Error(`Data em formato inválido (esperado dd/mm/aaaa): "${s}"`);
  }
  return new Date(y, m - 1, d);
}

/** Ex.: "2026-03-05" -> Date. Formato usado nos inputs de data (type="date"). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Data em formato inválido (esperado aaaa-mm-dd): "${s}"`);
  }
  return new Date(y, m - 1, d);
}

export function periodLabel(p: Period, range: CustomRange | null): string {
  if (p !== "custom") {
    return p === "Todos" ? "Todos" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias";
  }
  if (range?.start && range?.end) {
    const fmt = (s: string) => {
      const [, m, d] = s.split("-");
      return `${d}/${m}`;
    };
    return `${fmt(range.start)}–${fmt(range.end)}`;
  }
  return "Outro período";
}

export function inPeriod(dateStr: string, period: Period, range: CustomRange | null): boolean {
  if (period === "custom") {
    if (!range?.start || !range?.end) return true;
    const d = parseBRDate(dateStr);
    const end = parseISODate(range.end);
    end.setHours(23, 59, 59, 999);
    return d >= parseISODate(range.start) && d <= end;
  }
  const days = periodDays[period];
  if (days === null) return true;
  const diffMs = Date.now() - parseBRDate(dateStr).getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}
