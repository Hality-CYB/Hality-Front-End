import { describe, expect, it } from "vitest";
import { montarRelatorioDiagnostico, nomeArquivoRelatorio } from "@/lib/relatorio-diagnostico";
import type { Diagnostico } from "@/types/diagnostico";

function diagnostico(extra: Partial<Diagnostico> = {}): Diagnostico {
  return {
    id: "42",
    nivel: 2,
    status: "aguardando_revisao",
    imagemUrl: "/api/v1/diagnosticos/imagens/a.jpg",
    anamneseId: "7",
    criadoEm: "2026-11-10T15:00:00Z",
    confiancaIA: 87,
    respostasAnamnese: [
      {
        perguntaId: "boca_seca",
        enunciado: "Você sente boca seca?",
        tipo: "sim_nao",
        valor: "true",
      },
    ],
    conteudos: [
      {
        id: 1,
        titulo: "Limpe a língua",
        categoria: "geral",
        blocos: [
          { tipo: "texto", texto: "Use um limpador de língua." },
          { tipo: "imagem", url: "/x.png", legenda: "Limpador" },
        ],
      },
      { id: 2, titulo: "Só vídeo", categoria: "geral", blocos: [{ tipo: "video", url: "/v.mp4" }] },
      {
        id: 3,
        titulo: "Protocolo periodontal",
        categoria: "geral",
        blocos: [
          { tipo: "protocolo_tratamento", descricao: "Acompanhamento mensal.", numero_sessoes: 4 },
        ],
      },
    ],
    revisao: null,
    ...extra,
  } as Diagnostico;
}

const revisao = {
  revisado: true,
  profissionalNome: "Dra. Ana Souza",
  revisadoEm: "2026-11-11T12:00:00Z",
  observacoes: "  Saburra leve.  ",
  nivel: 3 as const,
  nivelCorrigido: true,
};

describe("montarRelatorioDiagnostico", () => {
  it("sem revisão: resultado da IA, escala e aviso de que falta revisar", () => {
    const r = montarRelatorioDiagnostico(diagnostico(), { pacienteNome: "Carla Mendes" });

    expect(r.resultado).toMatchObject({
      titulo: "Resultado da IA",
      nivel: "Halitose Íntima",
      detalhe: "Escala de halitose: 87%",
    });
    expect(r.aguardandoRevisao).toBe(true);
    expect(r.revisao).toBeNull();
    expect(r.pacienteNome).toBe("Carla Mendes");
  });

  it("revisão que mudou o nível: o revisado prevalece e o da IA vira detalhe", () => {
    const r = montarRelatorioDiagnostico(diagnostico({ status: "concluido", revisao }), {
      nivelIA: 2,
    });

    expect(r.resultado).toMatchObject({
      titulo: "Resultado revisado",
      nivel: "Mau Hálito Social",
      detalhe: "Ajustado na revisão. A IA indicou Halitose Íntima.",
    });
    expect(r.revisao).toEqual({
      autor: "Dra. Ana Souza",
      data: "11/11/2026",
      observacoes: "Saburra leve.",
    });
    expect(r.aguardandoRevisao).toBe(false);
  });

  it("revisão que confirmou o nível não repete a escala da IA", () => {
    const r = montarRelatorioDiagnostico(
      diagnostico({
        status: "concluido",
        revisao: { ...revisao, nivel: 2, nivelCorrigido: false },
      }),
    );

    expect(r.resultado).toMatchObject({ titulo: "Resultado revisado", nivel: "Halitose Íntima" });
    expect(r.resultado.detalhe).toBeNull();
  });

  it("anamnese com a resposta legível e orientações só com texto", () => {
    const r = montarRelatorioDiagnostico(diagnostico());

    expect(r.anamnese).toEqual([{ pergunta: "Você sente boca seca?", resposta: "Sim" }]);
    expect(r.orientacoes).toEqual([
      { titulo: "Limpe a língua", textos: ["Use um limpador de língua."] },
      { titulo: "Protocolo periodontal", textos: ["Acompanhamento mensal."] },
    ]);
  });

  it("o nome do arquivo não leva dado pessoal", () => {
    expect(nomeArquivoRelatorio({ id: "42", criadoEm: "2026-11-10T15:00:00Z" })).toBe(
      "check-your-breath-diagnostico-42-20261110.pdf",
    );
  });
});
