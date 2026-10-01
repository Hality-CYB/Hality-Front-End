import { describe, expect, it } from "vitest";
import { anamneseService } from "@/services/anamnese-service";
import type { RespostaAnamnese } from "@/types/anamnese";

describe("anamneseService", () => {
  it("lista o questionário vigente no formato do front (id/texto/tipo/opcoes)", async () => {
    const questionario = await anamneseService.listarPerguntas();

    expect(questionario.versao).toBeTruthy();
    expect(questionario.perguntas.length).toBeGreaterThan(0);
    for (const pergunta of questionario.perguntas) {
      expect(pergunta).toHaveProperty("id");
      expect(pergunta).toHaveProperty("texto");
      expect(["sim_nao", "escolha", "texto", "escala"]).toContain(pergunta.tipo);
    }
  });

  it("cria uma anamnese convertendo sim_nao/escala pro tipo que o back espera", async () => {
    const questionario = await anamneseService.listarPerguntas();
    const respostas: RespostaAnamnese[] = questionario.perguntas.map((p) => {
      if (p.tipo === "sim_nao")
        return { perguntaId: p.id, enunciado: p.texto, tipo: p.tipo, valor: "Sim" };
      if (p.tipo === "escala")
        return { perguntaId: p.id, enunciado: p.texto, tipo: p.tipo, valor: "4" };
      if (p.tipo === "escolha")
        return {
          perguntaId: p.id,
          enunciado: p.texto,
          tipo: p.tipo,
          valor: p.opcoes?.[0] ?? "",
        };
      return { perguntaId: p.id, enunciado: p.texto, tipo: p.tipo, valor: "Sem sintomas" };
    });

    const anamnese = await anamneseService.criar({
      versaoQuestionario: questionario.versao,
      respostas,
    });

    expect(typeof anamnese.id).toBe("string");
    expect(anamnese.id.length).toBeGreaterThan(0);
  });

  it("busca uma anamnese existente e devolve o id como string", async () => {
    const anamnese = await anamneseService.buscar("101");

    expect(anamnese.id).toBe("101");
    expect(anamnese.respostas.length).toBeGreaterThan(0);
  });
});
