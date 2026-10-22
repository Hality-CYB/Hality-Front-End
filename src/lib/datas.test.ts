import { describe, expect, it } from "vitest";
import {
  formatarDataSemHorario,
  hojeNoCalendario,
  idadeEmAnos,
  problemaDaDataDeNascimento,
} from "@/lib/datas";

const HOJE = new Date(2026, 9, 22); // 22/10/2026

describe("data de nascimento", () => {
  it("valida com as regras do back", () => {
    expect(problemaDaDataDeNascimento("1990-05-20", HOJE)).toBeNull();
    expect(problemaDaDataDeNascimento("", HOJE)).toBe("Informe a data de nascimento.");
    expect(problemaDaDataDeNascimento("2026-10-23", HOJE)).toMatch(/futuro/);
    expect(problemaDaDataDeNascimento("1899-12-31", HOJE)).toMatch(/ano/);
  });

  it("calcula a idade considerando se já fez aniversário no ano", () => {
    expect(idadeEmAnos("1990-10-22", HOJE)).toBe(36);
    expect(idadeEmAnos("1990-10-23", HOJE)).toBe(35);
    expect(idadeEmAnos("1990-01-01", HOJE)).toBe(36);
  });

  it("formata sem passar por fuso e devolve hoje no formato do input", () => {
    expect(formatarDataSemHorario("1990-05-20")).toBe("20/05/1990");
    expect(hojeNoCalendario(HOJE)).toBe("2026-10-22");
  });
});
