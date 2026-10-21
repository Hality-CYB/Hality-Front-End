import { describe, expect, it } from "vitest";
import { blocoUnicoEditavel, ehBlocoEditavel, problemasDoConteudo } from "@/types/conteudo";

describe("problemasDoConteudo", () => {
  it("conteúdo válido não tem problema", () => {
    expect(
      problemasDoConteudo({
        bloco: { tipo: "texto", texto: "Oi" },
        destinos: ["orientacoes_diagnostico", "home_autenticada"],
        classificacaoIds: [11],
      }),
    ).toEqual([]);
  });

  it("orientações exigem nível (mesma regra do back)", () => {
    expect(
      problemasDoConteudo({
        bloco: { tipo: "texto", texto: "Oi" },
        destinos: ["orientacoes_diagnostico"],
        classificacaoIds: [],
      }),
    ).toEqual(["Escolha pelo menos um nível para as orientações do diagnóstico."]);
  });

  it("texto vazio, endereço inválido e mídia sem descrição", () => {
    const sem = { destinos: [], classificacaoIds: [] };
    expect(problemasDoConteudo({ ...sem, bloco: { tipo: "texto", texto: " " } })).toEqual([
      "Escreva o texto.",
    ]);
    expect(
      problemasDoConteudo({ ...sem, bloco: { tipo: "video", url: "ftp://x", legenda: "" } }),
    ).toEqual(["Envie o arquivo do vídeo de novo.", "Escreva a descrição do vídeo."]);
    expect(
      problemasDoConteudo({ ...sem, bloco: { tipo: "imagem", url: "", legenda: "Foto" } }),
    ).toEqual(["Envie o arquivo da imagem."]);
  });
});

describe("blocoUnicoEditavel", () => {
  it("só edita conteúdo de um bloco, de formato conhecido", () => {
    expect(blocoUnicoEditavel([{ tipo: "texto", texto: "a" }])).toEqual({
      tipo: "texto",
      texto: "a",
    });
    expect(
      blocoUnicoEditavel([
        { tipo: "texto", texto: "a" },
        { tipo: "texto", texto: "b" },
      ]),
    ).toBeNull();
    expect(blocoUnicoEditavel([{ tipo: "protocolo_tratamento", descricao: "x" }])).toBeNull();
  });

  it("ehBlocoEditavel recusa campos que o editor não conhece", () => {
    expect(ehBlocoEditavel({ tipo: "imagem", url: "", legenda: "x", alt: "y" })).toBe(true);
    expect(ehBlocoEditavel({ tipo: "texto", texto: "a", extra: 1 })).toBe(false);
  });
});
