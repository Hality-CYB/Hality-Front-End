import { describe, expect, it } from "vitest";
import { nomeDaSaudacao } from "@/lib/nome-format";

describe("nomeDaSaudacao", () => {
  it.each([
    ["joao pedro da silva", "joao pedro"],
    ["Ana Paula Ferreira", "Ana Paula"],
    ["cleiton da silva", "cleiton da silva"],
    ["Maria de Fatima Souza", "Maria de Fatima"],
    ["Jose dos Santos Lima", "Jose dos Santos"],
    ["Ana", "Ana"],
    ["Ana Souza", "Ana Souza"],
    ["cleiton da", "cleiton da"],
    ["  joao   pedro  silva ", "joao pedro"],
    ["", ""],
  ])("%s vira %s", (nome, esperado) => {
    expect(nomeDaSaudacao(nome)).toBe(esperado);
  });
});
