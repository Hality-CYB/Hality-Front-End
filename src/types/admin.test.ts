import { describe, expect, it } from "vitest";
import { adaptBackendAdminResumo, backendAdminResumoSchema, contagemPorNivel } from "@/types/admin";
import type { Classificacao } from "@/types/classificacao";

const resposta = backendAdminResumoSchema.parse({
  periodo: { inicio: "2026-10-01", fim: "2026-10-30", timezone: "America/Sao_Paulo" },
  diagnosticos: {
    total: 9,
    por_classificacao: { "12": 4, "11": 3, sem_classificacao: 2 },
    por_status: { concluido: 5, aguardando_revisao: 2, processando: 1, falha: 1 },
  },
  revisao: { pendentes: 2, revisados: 5 },
  halitose: null,
});

// Ids fora de ordem e diferentes do nível, como no banco real.
const classificacoes: Classificacao[] = [
  { id: 13, codigo: "mau_halito_social", nome: "Mau Hálito Social", nivel: 3 },
  { id: 11, codigo: "halito_normal", nome: "Hálito Normal", nivel: 1 },
  { id: 12, codigo: "halitose_intima", nome: "Halitose Íntima", nivel: 2 },
];

describe("resumo do admin por classificação", () => {
  it("separa os diagnósticos sem classificação da contagem por id", () => {
    const resumo = adaptBackendAdminResumo(resposta);

    expect(resumo.semClassificacao).toBe(2);
    expect(resumo.porClassificacaoId).toEqual({ "11": 3, "12": 4 });
  });

  it("traduz o id em nível pela tabela de classificações, com zero no que não aparece", () => {
    const resumo = adaptBackendAdminResumo(resposta);

    expect(contagemPorNivel(resumo, classificacoes)).toEqual([
      { nivel: 1, total: 3 },
      { nivel: 2, total: 4 },
      { nivel: 3, total: 0 },
    ]);
  });

  it("assume zero sem diagnóstico sem classificação no período", () => {
    const resumo = adaptBackendAdminResumo({
      ...resposta,
      diagnosticos: { ...resposta.diagnosticos, por_classificacao: {} },
    });

    expect(resumo.semClassificacao).toBe(0);
  });
});
